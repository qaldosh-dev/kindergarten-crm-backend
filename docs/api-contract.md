# Shared API contract, implementation version 1

This contract fixes frontend/backend integration. Read specification.md for business rules. The coordinator owns contract changes. Use numeric ids, ISO dates, ISO instant timestamps and integer tenge JSON numbers. API prefix /api/v1. Error format application/problem+json with status, title, detail, code and optional fieldErrors. UI is Russian. Business timezone Asia/Qyzylorda.

## Common responses

Paginated collection: {content: [...], page: 0, size: 20, totalElements: 1, totalPages: 1}. Requests use page,size,sort. All list APIs below use this format unless expressly called an array. Optional filters may be omitted. Create returns the created DTO, update returns the updated DTO, action returns an updated resource or the stated result. Delete-like operations are explicit archive/cancel actions. A 204 response has no body.

Versions are numeric. For optimistic changes, body includes version returned by GET. New attendance version is null. Roles ADMIN, TEACHER. Token via Authorization: Bearer. Missing rights 403. Validation 400, business rule 422, conflicts 409. /actuator/health is available for readiness. All monetary totals are authoritative backend results.

## Auth and users

- POST /auth/login {login,password} -> {accessToken, expiresAt, user:{id,login,role,mustChangePassword}}.
- GET /me -> user.
- POST /auth/change-password {currentPassword,newPassword} -> 204. Tokens invalidated, login again.
- GET /users -> page of {id,login,role,active,mustChangePassword,version}.
- POST /users {login,password} -> user with role TEACHER.
- PATCH /users/{id} {login,active,version} -> user.
- POST /users/{id}/reset-password {newPassword} -> 204.

Demo-only profile seeds admin@demo.local / DemoAdmin2026! and teacher@demo.local / DemoTeacher2026!. Profile demo requires explicit enablement. Production initial administrator requires environment credentials and does not enable demo accounts. Demo data is fictional. JWT secret supplied by environment for production; demo-only deterministic secret permitted.

## Groups and children

- GET /groups?active=true -> page of Group {id,name,active,version}.
- POST /groups {name} -> Group.
- PATCH /groups/{id} {name,active,version} -> Group.
- GET /groups/{id}/teacher-assignments -> array of Assignment {id,teacherId,teacherLogin,groupId,validFrom,validTo}.
- POST /groups/{id}/teacher-assignments {teacherId,validFrom,validTo:null} -> Assignment.
- PATCH /teacher-assignments/{id} {validFrom,validTo} -> Assignment.
- GET /teacher/groups -> array of Group assigned to current teacher today.
- GET /children?groupId=&active=&search= -> page of Child.
- POST /children {fullName,birthDate,admissionDate,groupId,comment:"",contacts:[{representativeName,phone,relation:"PARENT",comment:""}]} -> Child.
- GET /children/{id} -> Child {id,fullName,birthDate,admissionDate,withdrawalDate:null,groupId,groupName,comment,contacts:[{id,representativeName,phone,relation,comment}],version}.
- PATCH /children/{id} {fullName,birthDate,admissionDate,comment,contacts:[...],version} -> Child. Supplied contacts replace contact collection transactionally.
- PUT /children/{id}/withdrawal {withdrawalDate,version} -> Child. null reopens admission if historical consistency permits.
- GET /children/{id}/group-memberships -> array {id,groupId,groupName,validFrom,validTo}.
- POST /children/{id}/group-memberships {groupId,validFrom} -> membership; previous membership closed on previous day transactionally.
- PATCH /group-memberships/{id} {groupId,validFrom,validTo,reason} -> membership.

## Attendance and illness

- GET /groups/{id}/attendance?date=YYYY-MM-DD -> {groupId,date,workingDay,closed,items:[{childId,fullName,status:null|PRESENT|ABSENT,version:null|number,updatedAt,updatedBy}]}.
- PUT /groups/{id}/attendance?date=... {items:[{childId,status,version}],reason:""} -> same response. Teacher only today and assigned group; ADMIN any eligible date and reason on correction. Atomic group save.
- GET /children/{id}/illness-certificates -> page of Certificate {id,childId,dateFrom,dateTo,receivedOn,confirmedAt,lateReason,revokedAt,revocationReason}.
- POST /children/{id}/illness-certificates {dateFrom,dateTo,receivedOn,lateReason:""} -> confirmed Certificate. ADMIN only. Service sets ABSENT for working days. If existing PRESENT dates, first response 409 code ATTENDANCE_CONFLICT and conflict dates, resubmit with confirmAttendanceOverride:true to explicitly override.
- POST /illness-certificates/{id}/revoke {reason} -> Certificate. Revoked certificate excluded from billing, attendance stays ABSENT.

## Calendar and tariffs

- GET /calendar/{year}/{monthNumber} -> {year,month,days:[{date,baseWorking,closed,reason,version}]} (month number 1..12).
- PUT same path {days:[{date,baseWorking,closed,reason,version}]} -> same response. Weekdays default working, weekends not working. Holidays set baseWorking=false. Exceptional closure sets closed=true while retaining baseWorking=true. Endpoint updates supplied dates atomically.
- GET /tariffs -> page of Tariff {id,ageFrom,ageToExclusive:null|number,monthlyAmount,validFrom,validTo:null|date,version}.
- POST /tariffs {ageFrom,ageToExclusive,monthlyAmount,validFrom,validTo} -> Tariff.
- PATCH /tariffs/{id} same fields plus version,reason -> Tariff.
- GET /children/{id}/price-overrides -> array of Override {id,monthlyAmount,validFrom,validTo,reason,version}.
- POST /children/{id}/price-overrides {monthlyAmount,validFrom,validTo,reason} -> Override.
- PATCH /price-overrides/{id} same fields plus version -> Override.

Seed baseline non-overlapping age categories [0,2),[2,4),[4,infinity) with 60000,50000,40000 effective 2020-01-01. Admin edits preserve issued invoice snapshots, mark affected invoices stale. Avoid unsupported overlapping tariff periods.

## Billing

URL month format YYYY-MM. Invoice {id,childId,childName,month,status:DRAFT|ISSUED,dueDate,amount,issuedAt,needsReconciliation,version,calculation:Calculation}.

Calculation {workingDays:number,payableDays:number,amount:number,excludedDays:[{date,reasons:["ILLNESS"|"CLOSED"|"OUTSIDE_ENROLLMENT"]}],tariffPeriods:[{from,to,monthlyAmount,payableDays}],explanation:string}. Working days denominator is base calendar, excluding weekends and holidays. Admitted/closed/ill dates filter numerator. Determine age at last day of month, so birthday tariff applies to entire month. Sum monthly prices of payable days then divide by total working days; round once CEILING. Zero working days -> zero. See spec for exact billing rules.

- POST /billing/months/{month}/calculate {} -> {month,results:[{childId,childName,invoiceId,status:"CALCULATED"|"ALREADY_ISSUED"|"ERROR",message}]}.
- GET /invoices?month=&childId=&status= -> page of Invoice.
- GET /invoices/{id} -> Invoice.
- POST /invoices/{id}/issue {version,dueDate:null|date} -> Invoice. dueDate defaults to month day 10, explicit required if first issued after day 10. Repeated issue returns existing invoice. Atomically posts charge once.
- POST /invoices/{id}/reconciliation-preview {} -> {invoiceId,previousAmount,newAmount,difference,calculation}.
- POST /invoices/{id}/reconcile {reason} -> {invoiceId,previousAmount,newAmount,difference,entryId:null|number}. Recomputes under lock, never trusts client amount. Difference = new target minus original charge and previous reconciliations. Repeat yields zero.

Reconciliation compares only automatic CHARGE and RECONCILIATION entries. Explicit manual ADJUSTMENT entries stay in account/allocated invoice totals and are preserved across automatic recalculation. Birthday-month pricing treats February as birthday month for February29 births in non-leap years too.

## Payments and account

Account {childId,balance,debt,credit,entries:[{id,type,amount,createdAt,reason,invoiceId,paymentId}],payments:[Payment]}. Positive balance debt, negative credit. Entry amount signed relative to debt (payments negative, refunds positive). Lists in account can cover complete history for MVP but must be bounded/paginatable if it grows; entries endpoint may supplement it.

Payment {id,childId,childName,amount,paidOn,method:CASH|TRANSFER,comment,cancelledAt,cancellationReason}.

- GET /children/{id}/account -> Account.
- GET /payments?childId=&month= -> page of Payment (month filters paidOn).
- POST /payments {childId,amount,paidOn,method,comment} -> Payment.
- POST /payments/{id}/cancel {reason} -> Payment. Idempotent cancellation.
- POST /children/{id}/opening-balance {amount,reason} -> Account. Signed amount, one opening operation per child, repeat conflict except identical key.
- POST /children/{id}/adjustments {amount,reason,invoiceId:null|number} -> Account. Signed correction, mandatory reason.
- POST /children/{id}/refunds {amount,paidOn,reason} -> Account. Positive amount <= available credit.

All financial creation POSTs above accept Idempotency-Key UUID. Identical key/body returns original response, different body 409. Per-child locking serializes ledger/allocation changes. Oldest charges paid first, leftover payment is credit, reallocation after corrections/cancellations. Income totals exclude cancelled payments and show refunds distinctly.

## Reports and audit

- GET /reports/billing?month= -> {month,totalCharged,totalPaid,totalRefunded,totalDebt,totalCredit,rows:[{childId,childName,groupName,charged,paid,refunded,balance,debt,credit,needsReconciliation}]}. Charged = ledger charges and related invoice corrections for that invoice month. Paid/refunded = cashflow by operation paidOn month. Balance/debt/credit = current account position, clearly labeled in UI. Opening balances are excluded from month revenue.
- GET /reports/billing.csv?month= -> UTF-8 CSV, proper quoting and spreadsheet formula injection mitigation for user strings.
- GET /audit-events?page=&size=&entityType=&entityId=&actorId= -> page of {id,actorId,actorLogin,occurredAt,entityType,entityId,action,before,after,reason}.

Backend Docker port 8080, frontend production port 80 (exposed 3000 on host), local Vite port 5173 proxies /api and /actuator to http://localhost:8080. Backend container DB postgres:5432/kindergarten, host forwarded 5433 to avoid existing local servers. PostgreSQL credentials from env. Frontend production nginx proxies /api and /actuator to backend:8080. JWT stays in frontend memory. On reload login required; no token in localStorage. Russian tenge/date formatting.
