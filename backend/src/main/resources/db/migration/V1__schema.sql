CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_user (
 id bigserial PRIMARY KEY, login varchar(160) NOT NULL UNIQUE, password_hash varchar(100) NOT NULL,
 role varchar(16) NOT NULL CHECK(role IN ('ADMIN','TEACHER')), active boolean NOT NULL DEFAULT true,
 must_change_password boolean NOT NULL DEFAULT true, token_version bigint NOT NULL DEFAULT 0, version bigint NOT NULL DEFAULT 0
);
CREATE TABLE kindergarten_group (id bigserial PRIMARY KEY, name varchar(160) NOT NULL CHECK(length(trim(name))>0), active boolean NOT NULL DEFAULT true, version bigint NOT NULL DEFAULT 0);
CREATE TABLE child (
 id bigserial PRIMARY KEY, full_name varchar(250) NOT NULL CHECK(length(trim(full_name))>0), birth_date date NOT NULL,
 admission_date date NOT NULL, withdrawal_date date, comment text NOT NULL DEFAULT '', version bigint NOT NULL DEFAULT 0,
 CHECK(birth_date <= admission_date), CHECK(withdrawal_date IS NULL OR withdrawal_date>=admission_date)
);
CREATE TABLE child_contact (id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child, representative_name varchar(250) NOT NULL, phone varchar(60) NOT NULL, relation varchar(60) NOT NULL, comment text NOT NULL DEFAULT '');
CREATE INDEX contact_child_idx ON child_contact(child_id);
CREATE TABLE teacher_assignment (
 id bigserial PRIMARY KEY, teacher_id bigint NOT NULL REFERENCES app_user, group_id bigint NOT NULL REFERENCES kindergarten_group,
 valid_from date NOT NULL, valid_to date, CHECK(valid_to IS NULL OR valid_to>=valid_from),
 EXCLUDE USING gist (teacher_id WITH =, group_id WITH =, daterange(valid_from,valid_to,'[]') WITH &&)
);
CREATE INDEX assignment_group_idx ON teacher_assignment(group_id,valid_from,valid_to);
CREATE TABLE child_group_membership (
 id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child, group_id bigint NOT NULL REFERENCES kindergarten_group,
 valid_from date NOT NULL, valid_to date, CHECK(valid_to IS NULL OR valid_to>=valid_from),
 EXCLUDE USING gist (child_id WITH =, daterange(valid_from,valid_to,'[]') WITH &&)
);
CREATE INDEX membership_group_idx ON child_group_membership(group_id,valid_from,valid_to);
CREATE TABLE attendance (
 id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child, date date NOT NULL, status varchar(12) NOT NULL CHECK(status IN ('PRESENT','ABSENT')),
 updated_by bigint NOT NULL REFERENCES app_user, updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 0,
 UNIQUE(child_id,date)
);
CREATE INDEX attendance_date_idx ON attendance(date);
CREATE TABLE calendar_day (date date PRIMARY KEY, base_working boolean NOT NULL, closed boolean NOT NULL DEFAULT false, reason text NOT NULL DEFAULT '', version bigint NOT NULL DEFAULT 0);
CREATE TABLE tariff_version (
 id bigserial PRIMARY KEY, age_from integer NOT NULL CHECK(age_from>=0), age_to_exclusive integer,
 monthly_amount numeric(19,0) NOT NULL CHECK(monthly_amount>=0), valid_from date NOT NULL, valid_to date, version bigint NOT NULL DEFAULT 0,
 CHECK(age_to_exclusive IS NULL OR age_to_exclusive>age_from), CHECK(valid_to IS NULL OR valid_to>=valid_from),
 EXCLUDE USING gist (int4range(age_from,age_to_exclusive,'[)') WITH &&, daterange(valid_from,valid_to,'[]') WITH &&)
);
INSERT INTO tariff_version(age_from,age_to_exclusive,monthly_amount,valid_from) VALUES(0,2,60000,'2020-01-01'),(2,4,50000,'2020-01-01'),(4,NULL,40000,'2020-01-01');
CREATE TABLE child_price_override (
 id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child, monthly_amount numeric(19,0) NOT NULL CHECK(monthly_amount>=0),
 valid_from date NOT NULL, valid_to date, reason text NOT NULL CHECK(length(trim(reason))>0), version bigint NOT NULL DEFAULT 0,
 CHECK(valid_to IS NULL OR valid_to>=valid_from),
 EXCLUDE USING gist (child_id WITH =, daterange(valid_from,valid_to,'[]') WITH &&)
);
CREATE TABLE illness_certificate (
 id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child, date_from date NOT NULL, date_to date NOT NULL, received_on date NOT NULL,
 confirmed_at timestamptz NOT NULL DEFAULT now(), confirmed_by bigint NOT NULL REFERENCES app_user, late_reason text NOT NULL DEFAULT '',
 revoked_at timestamptz, revocation_reason text, CHECK(date_to>=date_from), CHECK(received_on>=date_from)
);
CREATE INDEX illness_child_dates_idx ON illness_certificate(child_id,date_from,date_to) WHERE revoked_at IS NULL;
CREATE TABLE invoice (
 id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child, month date NOT NULL CHECK(extract(day from month)=1),
 status varchar(12) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ISSUED')), due_date date NOT NULL,
 issued_at timestamptz, calculation_snapshot jsonb NOT NULL, amount numeric(19,0) NOT NULL CHECK(amount>=0),
 needs_reconciliation boolean NOT NULL DEFAULT false, version bigint NOT NULL DEFAULT 0, UNIQUE(child_id,month),
 CHECK((status='DRAFT' AND issued_at IS NULL) OR (status='ISSUED' AND issued_at IS NOT NULL))
);
CREATE INDEX invoice_month_idx ON invoice(month,status);
CREATE TABLE payment (
 id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child, amount numeric(19,0) NOT NULL CHECK(amount>0), paid_on date NOT NULL,
 method varchar(12) NOT NULL CHECK(method IN ('CASH','TRANSFER')), comment text NOT NULL DEFAULT '', created_by bigint NOT NULL REFERENCES app_user,
 cancelled_at timestamptz, cancellation_reason text
);
CREATE INDEX payment_child_date_idx ON payment(child_id,paid_on,id);
CREATE TABLE account_entry (
 id bigserial PRIMARY KEY, child_id bigint NOT NULL REFERENCES child,
 type varchar(24) NOT NULL CHECK(type IN ('CHARGE','RECONCILIATION','PAYMENT','PAYMENT_CANCEL','REFUND','OPENING_BALANCE','ADJUSTMENT')),
 amount numeric(19,0) NOT NULL, invoice_id bigint REFERENCES invoice, payment_id bigint REFERENCES payment,
 paid_on date NOT NULL, created_by bigint NOT NULL REFERENCES app_user, created_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL DEFAULT '', calculation_snapshot jsonb,
 CHECK((type='PAYMENT' AND amount<0) OR (type IN ('CHARGE','PAYMENT_CANCEL','REFUND') AND amount>=0) OR type IN ('RECONCILIATION','OPENING_BALANCE','ADJUSTMENT'))
);
CREATE INDEX entry_child_idx ON account_entry(child_id,paid_on,id);
CREATE INDEX entry_invoice_idx ON account_entry(invoice_id);
CREATE UNIQUE INDEX one_charge_per_invoice ON account_entry(invoice_id) WHERE type='CHARGE';
CREATE UNIQUE INDEX one_opening_per_child ON account_entry(child_id) WHERE type='OPENING_BALANCE';
CREATE UNIQUE INDEX one_cancellation_per_payment ON account_entry(payment_id) WHERE type='PAYMENT_CANCEL';
CREATE TABLE payment_allocation (
 id bigserial PRIMARY KEY, payment_id bigint NOT NULL REFERENCES payment, charge_entry_id bigint NOT NULL REFERENCES account_entry,
 amount numeric(19,0) NOT NULL CHECK(amount>0), UNIQUE(payment_id,charge_entry_id)
);
CREATE TABLE idempotency_request (
 request_key uuid PRIMARY KEY, actor_id bigint NOT NULL REFERENCES app_user, fingerprint varchar(64) NOT NULL,
 response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_event (
 id bigserial PRIMARY KEY, actor_id bigint REFERENCES app_user, actor_login varchar(160) NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
 entity_type varchar(80) NOT NULL, entity_id bigint, action varchar(60) NOT NULL,
 before_value jsonb, after_value jsonb, reason text NOT NULL DEFAULT ''
);
CREATE INDEX audit_filter_idx ON audit_event(entity_type,entity_id,occurred_at);
CREATE INDEX audit_actor_idx ON audit_event(actor_id,occurred_at);

-- Issued snapshots and posted ledger history are append-only. Reconciliation is a new entry.
CREATE FUNCTION protect_issued_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='ISSUED' AND (NEW.child_id,NEW.month,NEW.amount,NEW.calculation_snapshot,NEW.issued_at,NEW.due_date,NEW.status)
   IS DISTINCT FROM (OLD.child_id,OLD.month,OLD.amount,OLD.calculation_snapshot,OLD.issued_at,OLD.due_date,OLD.status) THEN
   RAISE EXCEPTION 'Issued invoice snapshot is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_invoice BEFORE UPDATE ON invoice FOR EACH ROW EXECUTE FUNCTION protect_issued_invoice();
CREATE FUNCTION prohibit_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Financial and audit history is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_ledger BEFORE UPDATE OR DELETE ON account_entry FOR EACH ROW EXECUTE FUNCTION prohibit_history_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_event FOR EACH ROW EXECUTE FUNCTION prohibit_history_mutation();
CREATE TRIGGER no_invoice_delete BEFORE DELETE ON invoice FOR EACH ROW EXECUTE FUNCTION prohibit_history_mutation();
