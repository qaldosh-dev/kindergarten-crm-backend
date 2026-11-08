# Kindergarten backend

Java 21, Spring Boot 3.5.16, Maven, PostgreSQL, Flyway, JPA, Spring Security JWT, MapStruct, springdoc, JUnit and Testcontainers. The backend implements the paths and DTOs in `../docs/api-contract.md`. No frontend or root configuration is owned here.

## Start locally

Use Java 21 and PostgreSQL 17. Create a database and set the variables shown in `.env.example`; Spring Boot does not automatically load that file. From `backend/`:

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5433/kindergarten'
$env:DB_USER = 'kindergarten'
$env:DB_PASSWORD = 'your-local-database-password'
$env:SPRING_PROFILES_ACTIVE = 'demo'
mvn.cmd spring-boot:run
```

The coordinator supplies the official Maven wrapper. Once generated, use `./mvnw` on Unix or `./mvnw.cmd` on Windows in place of installed Maven. No handwritten wrapper is used.

The explicit `demo` profile enables fictional sample groups, two teachers, five children, birthday-month pricing, mid-month admission/withdrawal, illness reconciliation, partial payment, imported debt and credit. Accounts:

| Login | Password | Role |
| --- | --- | --- |
| admin@demo.local | DemoAdmin2026! | ADMIN |
| teacher@demo.local | DemoTeacher2026! | TEACHER |
| teacher2@demo.local | DemoTeacher2026! | TEACHER |

Demo seeding uses the current business month and runs once on an empty child dataset. It does not reset data on every restart. Use a separate demo database. The deterministic demo JWT secret is used only with the explicit demo profile; `JWT_SECRET` overrides it.

HTTP listens on port 8080. Readiness: `GET /actuator/health/readiness` (includes database connectivity); health: `/actuator/health`. OpenAPI JSON: `/v3/api-docs`; interactive documentation: `/swagger-ui.html`. All application routes start with `/api/v1`.

## Container

The coordinator-owned root compose supplies `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_LOGIN`, `ADMIN_PASSWORD` and `SPRING_PROFILES_ACTIVE`. Its database URL is `jdbc:postgresql://postgres:5432/kindergarten`; the forwarded host port is 5433.

To build this directory independently:

```sh
docker build -t kindergarten-backend ./backend
docker run --rm --env-file backend/.env -p 8080:8080 kindergarten-backend
```

Set `DB_URL` to a PostgreSQL hostname reachable from the container. The image builds with Maven/Java 21 and runs as an unprivileged user using a Java 21 JRE. Tests run separately before deployment; image packaging skips test execution. `.dockerignore` includes only the POM, application/test sources and Dockerfile, excluding local caches and scratch checks.

## Production configuration

Do not enable `demo`. Supply `DB_URL`, `DB_USER`, `DB_PASSWORD` and a random `JWT_SECRET` of at least 32 UTF-8 bytes. The first startup of an empty production database also requires `ADMIN_LOGIN` and `ADMIN_PASSWORD` (10–72 characters). The initial administrator must change their password. Later startups do not reset that account from the environment. New teachers and administrator-reset passwords also require a password change; until then only `/me` and `/auth/change-password` are available.

JWTs expire after two hours and are checked against the current user status and token generation on every request. Blocking a user, resetting a password or changing a password invalidates existing tokens. Passwords use BCrypt. Tokens and passwords are not audit payloads. Keep PostgreSQL private, terminate HTTPS at the reverse proxy and back up the database before upgrades. Flyway needs permission to create tables and the trusted `btree_gist` extension, or have the database owner provision that extension first. Hibernate validates the Flyway schema and never creates it.

Example backup and restore using PostgreSQL client tools (credentials supplied through the environment):

```sh
pg_dump -h postgres -U kindergarten -d kindergarten -Fc -f kindergarten.dump
pg_restore -h postgres -U kindergarten --no-owner --dbname kindergarten_restore kindergarten.dump
```

Restore into a newly created, empty database, point a backend instance at it, and verify Flyway validation, readiness, account balances and reports before using it.

## Structure and transaction rules

Feature packages contain typed request/response records, Bean Validation, controllers, services, JPA entities, Spring Data repositories and MapStruct mappers. Entities are never API responses. Collection endpoints paginate in PostgreSQL using `Pageable`, with size capped at 200 and controlled sort fields. Child pages batch-load contacts and memberships; invoice/payment pages fetch their child through an entity graph. Reports use one explicit aggregate SQL query to avoid multiplying amounts across joins. `open-in-view=false`.

`BillingCalculator` and `PaymentAllocator` are pure components. The database stores inclusive dated group memberships, teacher assignments, tariff versions, individual prices, calendar exceptions, confirmed illness, immutable invoice calculation inputs/results, append-only ledger entries, payments, derived allocations, audit and idempotency responses.

Every financial mutation locks the stable child row in its transaction. Source changes for that child use the same lock. Calendar and age-tariff edits take a global exclusive PostgreSQL transaction advisory lock; calculations/child mutations take its shared counterpart before child locking. This prevents an invoice issue from escaping a simultaneous source edit without a stale marker. Attendance batches acquire child locks in ascending ID order. Mutable resources check versions; PostgreSQL exclusion constraints enforce non-overlapping periods even under concurrency.

Invoice issue refreshes data after waiting for the child lock, recalculates, and posts one charge in the same transaction. A unique partial index prevents a second charge. Issued invoice snapshots, ledger entries and audit records are protected by database triggers. Reconciliation records a new snapshot in an additional ledger entry. Invoice history is never rewritten and old debt is never included in a new month's charge.

Source edits conservatively mark all issued invoices for the affected child stale; global calendar/tariff edits mark all issued invoices stale. This can flag unaffected months, but never omits a potentially affected issued month. A zero-difference reconciliation clears the flag without posting a financial entry.

## Billing and manual corrections

The denominator is the month's base working days. Enrollment boundaries filter payable days inclusively. Closures and confirmed illness are a union of excluded dates; ordinary absence does not change charges. Age is determined by birth year/month relative to the billing month, so the new tariff applies throughout the birthday month, including February 29 births in non-leap Februaries. Individual dated prices override age prices. Monthly prices are summed for payable dates, then divided once with `CEILING` to integer tenge. A month with no base working days costs zero.

Automatic reconciliation compares the new calculated amount only to **CHARGE + prior RECONCILIATION entries**. Explicit manual **ADJUSTMENT** entries remain intact, whether discounts or surcharges. For example: an automatic charge of 50,000 and a manual -5,000 remain a balance of 45,000 after unchanged-source reconciliation. A later illness changes only the automatic component. Allocation and reporting use the full ledger, including the manual adjustment.

The signed ledger balance is authoritative: positive means debt, negative means credit. Opening balance is a distinct one-time operation. Cancelled payments retain their original record and are reversed once by a new entry. Refunds cannot exceed credit under the child lock. Allocation is rebuilt FIFO by operation date and ID. Refunds consume general correction credit first and then cash available from the newest payments; the remaining funds pay the oldest obligations. Cancellation after a refund may therefore create debt, and the net refundable cash remains consistent with the signed ledger.

Financial POSTs accept an optional UUID `Idempotency-Key`. A transaction advisory lock serializes concurrent requests using that key. The stored fingerprint includes actor, operation/path and typed body. Identical requests return the original response; any reuse with different content or actor returns 409. A failed transaction leaves neither its financial effects nor its idempotency response.

Account responses include the latest 200 entries and payments. Full entries are available through the supplemental `GET /children/{id}/account/entries?page=&size=` endpoint; payment history is paginated through the contracted `/payments?childId=` route. Balances always cover the complete ledger. Reports label current balance separately from invoice-month charges and paid-on-month cashflow; cancelled payments are excluded and refunds remain distinct. CSV quotes text, includes UTF-8 BOM and neutralizes spreadsheet formulas in user strings.

## Checks and current verification

Run the real build from `backend/` with Docker Engine already available:

```sh
mvn -B -ntp verify
```

To run only pure unit tests:

```sh
mvn -B -ntp -Dtest=BillingCalculatorTest,PaymentAllocatorTest,ReportCsvTest test
```

`BackendIntegrationTest` starts a real PostgreSQL 17 Testcontainer, migrates an empty database, validates JPA mappings, and exercises real services and HTTP/security. It is not silently disabled when Docker is unavailable. It covers issue/draft concurrency, payment/refund concurrency, identical/conflicting idempotency keys, rollback, partial payment/credit/cancellation/refund, manual adjustments surviving repeated automatic reconciliation, teacher object restrictions, password invalidation, atomic attendance corrections, illness override, report amounts and schema constraints.

Verified with the real Maven build: **47 tests passed (32 unit tests and 15 PostgreSQL integration tests), with no failures or skipped tests.** The official Maven wrapper is included. GitHub Actions also passed the backend and frontend builds and the complete Docker Compose demo smoke check. The smoke check exercises login, teacher restrictions, invoice issue, partial payment, idempotent replay, balance, and CSV reporting through the frontend proxy. All demo data is fictional.
