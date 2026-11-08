-- Enforce account ownership even when data is written outside the application.
ALTER TABLE invoice ADD CONSTRAINT invoice_id_child_unique UNIQUE (id, child_id);
ALTER TABLE payment ADD CONSTRAINT payment_id_child_unique UNIQUE (id, child_id);
ALTER TABLE account_entry ADD CONSTRAINT entry_invoice_same_child
    FOREIGN KEY (invoice_id, child_id) REFERENCES invoice (id, child_id);
ALTER TABLE account_entry ADD CONSTRAINT entry_payment_same_child
    FOREIGN KEY (payment_id, child_id) REFERENCES payment (id, child_id);
ALTER TABLE account_entry ADD CONSTRAINT entry_source_matches_type CHECK (
    (type IN ('CHARGE', 'RECONCILIATION') AND invoice_id IS NOT NULL AND payment_id IS NULL)
    OR (type IN ('PAYMENT', 'PAYMENT_CANCEL') AND payment_id IS NOT NULL AND invoice_id IS NULL)
    OR (type IN ('REFUND', 'OPENING_BALANCE') AND invoice_id IS NULL AND payment_id IS NULL)
    OR (type = 'ADJUSTMENT' AND payment_id IS NULL)
);

CREATE INDEX allocation_charge_idx ON payment_allocation (charge_entry_id);
CREATE INDEX payment_paid_on_idx ON payment (paid_on) WHERE cancelled_at IS NULL;
CREATE INDEX entry_refund_date_idx ON account_entry (paid_on, child_id) WHERE type = 'REFUND';
