package kz.kindergarten;

import com.fasterxml.jackson.databind.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import kz.kindergarten.auth.AuthDtos.*;
import kz.kindergarten.auth.AuthService;
import kz.kindergarten.billing.*;
import kz.kindergarten.billing.BillingDtos.*;
import kz.kindergarten.children.*;
import kz.kindergarten.children.ChildDtos.*;
import kz.kindergarten.finance.*;
import kz.kindergarten.finance.FinanceDtos.*;
import kz.kindergarten.groups.*;
import kz.kindergarten.groups.GroupDtos.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Uses the real HTTP/security boundary and a real migrated PostgreSQL database. */
@SpringBootTest(properties = {
        "app.jwt-secret=integration-tests-only-32-byte-secret-2026",
        "app.admin-login=admin@test.invalid", "app.admin-password=InitialAdmin2026!"
})
@AutoConfigureMockMvc
@Testcontainers
@Import(BackendIntegrationTest.FixedTime.class)
class BackendIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class FixedTime {
        @Bean @Primary
        Clock testClock() { return Clock.fixed(Instant.parse("2026-11-09T06:00:00Z"), ZoneOffset.UTC); }
    }

    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired ChildService children;
    @Autowired GroupService groups;
    @Autowired BillingService billing;
    @Autowired FinanceService finance;
    @Autowired AuthService auth;
    private String adminToken;
    private long adminId;

    @BeforeEach
    void authenticate() throws Exception {
        JsonNode login = request("POST", "/auth/login", "{\"login\":\"admin@test.invalid\",\"password\":\"InitialAdmin2026!\"}", null, 200);
        if (login.path("user").path("mustChangePassword").asBoolean()) {
            request("POST", "/auth/change-password", "{\"currentPassword\":\"InitialAdmin2026!\",\"newPassword\":\"InitialAdmin2026!\"}", login.path("accessToken").asText(), 204);
            login = request("POST", "/auth/login", "{\"login\":\"admin@test.invalid\",\"password\":\"InitialAdmin2026!\"}", null, 200);
        }
        adminToken = login.path("accessToken").asText();
        adminId = login.path("user").path("id").asLong();
        setActor();
    }

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    private void setActor() {
        var jwt = Jwt.withTokenValue("test-internal").header("alg", "HS256").subject(Long.toString(adminId))
                .claim("login", "admin@test.invalid").claim("role", "ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    private JsonNode request(String method, String path, Object body, String token, int status) throws Exception {
        var builder = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(org.springframework.http.HttpMethod.valueOf(method), "/api/v1" + path);
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(body instanceof String text ? text : json.writeValueAsString(body));
        var result = http.perform(builder).andExpect(status().is(status)).andReturn();
        String response = result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        return response.isBlank() ? json.nullNode() : json.readTree(response);
    }

    private ChildView child() {
        setActor();
        var group = groups.create(new CreateGroup("Тест " + UUID.randomUUID()));
        return children.create(new CreateChild("Вымышленный Ребёнок " + UUID.randomUUID(), LocalDate.of(2023, 4, 1),
                LocalDate.of(2026, 9, 1), group.id(), "тест", List.of(new ContactInput(null, "Демо Представитель", "+7 000 000 00 00", "PARENT", ""))));
    }

    private InvoiceView issue(long childId) {
        var draft = billing.draft(childId, YearMonth.of(2026, 11));
        var invoice = billing.get(draft.invoiceId());
        return billing.issue(invoice.id(), new Issue(invoice.version(), null), null);
    }

    @Test
    void contactOnlyCardUpdateAdvancesVersionAndRejectsStaleReplacement() throws Exception {
        var child = child();
        var firstUpdate = new UpdateChild(child.fullName(), child.birthDate(), child.admissionDate(),
                child.comment(), List.of(new ContactInput(null, "Первый контакт", "+7 000 000 00 01", "PARENT", "")), child.version());
        var updated = request("PATCH", "/children/" + child.id(), firstUpdate, adminToken, 200);
        assertThat(updated.path("version").asLong()).isGreaterThan(child.version());

        var staleUpdate = new UpdateChild(child.fullName(), child.birthDate(), child.admissionDate(),
                child.comment(), List.of(new ContactInput(null, "Устаревшая правка", "+7 000 000 00 02", "PARENT", "")), child.version());
        request("PATCH", "/children/" + child.id(), staleUpdate, adminToken, 409);
        var current = request("GET", "/children/" + child.id(), null, adminToken, 200);
        assertThat(current.path("contacts").get(0).path("representativeName").asText()).isEqualTo("Первый контакт");
    }

    @Test
    void paymentPartialCreditCancelRefundAndOldDebtUseOneSignedLedger() {
        var child = child();
        var invoice = issue(child.id());
        assertThat(invoice.amount()).isEqualByComparingTo("50000");
        finance.opening(child.id(), new OpeningBalance(new BigDecimal("10000"), "Долг до запуска"), null);
        var partial = finance.pay(new CreatePayment(child.id(), new BigDecimal("15000"), LocalDate.of(2026, 11, 1), Method.CASH, ""), null);
        assertThat(finance.account(child.id()).balance()).isEqualByComparingTo("45000");
        var advance = finance.pay(new CreatePayment(child.id(), new BigDecimal("55000"), LocalDate.of(2026, 11, 2), Method.TRANSFER, ""), null);
        assertThat(finance.account(child.id()).credit()).isEqualByComparingTo("10000");
        finance.refund(child.id(), new Refund(new BigDecimal("4000"), LocalDate.of(2026, 11, 3), "Возврат"), null);
        assertThat(finance.account(child.id()).credit()).isEqualByComparingTo("6000");
        finance.cancel(advance.id(), new Reason("Ошибочная запись"), null);
        finance.cancel(advance.id(), new Reason("Повтор"), null);
        assertThat(finance.account(child.id()).debt()).isEqualByComparingTo("49000");
        assertThat(jdbc.queryForObject("select count(*) from account_entry where payment_id=? and type='PAYMENT_CANCEL'", Long.class, advance.id())).isEqualTo(1);
        assertThat(jdbc.queryForObject("select sum(a.amount) from payment_allocation a where payment_id=?", BigDecimal.class, partial.id())).isEqualByComparingTo("11000");
        assertThatThrownBy(() -> finance.refund(child.id(), new Refund(BigDecimal.ONE, LocalDate.of(2026, 11, 4), "Недоступно"), null))
                .isInstanceOf(kz.kindergarten.common.ApiException.class);
    }

    @Test
    void identicalIdempotencyKeyReplaysOriginalAndDifferentBodyConflicts() {
        var child = child();
        UUID key = UUID.randomUUID();
        var payment = new CreatePayment(child.id(), new BigDecimal("1000"), LocalDate.of(2026, 11, 9), Method.CASH, "тест");
        var first = finance.pay(payment, key);
        assertThat(finance.pay(payment, key)).isEqualTo(first);
        assertThatThrownBy(() -> finance.pay(new CreatePayment(child.id(), new BigDecimal("2000"), payment.paidOn(), Method.CASH, "тест"), key))
                .isInstanceOf(kz.kindergarten.common.ApiException.class).hasMessageContaining("Ключ");
        assertThat(finance.account(child.id()).balance()).isEqualByComparingTo("-1000");
    }

    @Test
    void concurrentDraftAndIssueHaveOneInvoiceAndOneCharge() throws Exception {
        var child = child();
        var results = concurrent(() -> billing.draft(child.id(), YearMonth.of(2026, 11)));
        assertThat(results.getFirst().invoiceId()).isEqualTo(results.getLast().invoiceId());
        var draft = billing.get(results.getFirst().invoiceId());
        var issued = concurrent(() -> billing.issue(draft.id(), new Issue(draft.version(), null), null));
        assertThat(issued.getFirst().id()).isEqualTo(issued.getLast().id());
        assertThat(jdbc.queryForObject("select count(*) from account_entry where invoice_id=? and type='CHARGE'", Long.class, draft.id())).isEqualTo(1);
        assertThat(finance.account(child.id()).balance()).isEqualByComparingTo("50000");
    }

    @Test
    void concurrentRefundsCannotSpendSameCreditAndPaymentsAreNotLost() throws Exception {
        var child = child();
        concurrent(() -> finance.pay(new CreatePayment(child.id(), new BigDecimal("100"), LocalDate.of(2026, 11, 9), Method.CASH, ""), UUID.randomUUID()));
        assertThat(finance.account(child.id()).credit()).isEqualByComparingTo("200");
        var outcomes = concurrent(() -> {
            try {
                finance.refund(child.id(), new Refund(new BigDecimal("150"), LocalDate.of(2026, 11, 9), "Возврат"), UUID.randomUUID());
                return "OK";
            } catch (kz.kindergarten.common.ApiException exception) {
                return "REJECTED";
            }
        });
        assertThat(outcomes).containsExactlyInAnyOrder("OK", "REJECTED");
        assertThat(finance.account(child.id()).credit()).isEqualByComparingTo("50");
    }

    @Test
    void lateIllnessIsExplicitAndReconciliationRepeatedIsZeroWhileOriginalSnapshotStaysImmutable() throws Exception {
        var child = child();
        var invoice = issue(child.id());
        var original = jdbc.queryForObject("select calculation_snapshot::text from invoice where id=?", String.class, invoice.id());
        request("POST", "/children/" + child.id() + "/illness-certificates", "{\"dateFrom\":\"2026-09-07\",\"dateTo\":\"2026-09-07\",\"receivedOn\":\"2026-09-08\"}", adminToken, 422);
        request("POST", "/children/" + child.id() + "/illness-certificates", "{\"dateFrom\":\"2026-11-02\",\"dateTo\":\"2026-11-03\",\"receivedOn\":\"2026-11-04\"}", adminToken, 200);
        setActor();
        assertThat(billing.get(invoice.id()).needsReconciliation()).isTrue();
        var preview = billing.preview(invoice.id());
        assertThat(preview.difference()).isNegative();
        var correction = billing.reconcile(invoice.id(), new Reconcile("Справка"), null);
        assertThat(correction.difference()).isEqualByComparingTo(preview.difference());
        assertThat(billing.reconcile(invoice.id(), new Reconcile("Повторная сверка"), null).difference()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(jdbc.queryForObject("select calculation_snapshot::text from invoice where id=?", String.class, invoice.id())).isEqualTo(original);
        assertThatThrownBy(() -> jdbc.update("update invoice set amount=amount+1 where id=?", invoice.id())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {-5000, 5000})
    void automaticReconciliationPreservesManualInvoiceDiscountOrSurcharge(int manualAmount) throws Exception {
        var child = child();
        var invoice = issue(child.id());
        BigDecimal manual = BigDecimal.valueOf(manualAmount);
        BigDecimal originalAutomatic = new BigDecimal("50000");
        finance.adjust(child.id(), new Adjustment(manual, "Ручная скидка или доплата", invoice.id()), null);

        var unchanged = billing.reconcile(invoice.id(), new Reconcile("Сверка без изменения источников"), null);
        assertThat(unchanged.previousAmount()).isEqualByComparingTo(originalAutomatic);
        assertThat(unchanged.difference()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(unchanged.entryId()).isNull();
        assertThat(finance.account(child.id()).balance()).isEqualByComparingTo(originalAutomatic.add(manual));

        request("POST", "/children/" + child.id() + "/illness-certificates",
                "{\"dateFrom\":\"2026-11-02\",\"dateTo\":\"2026-11-02\",\"receivedOn\":\"2026-11-03\"}", adminToken, 200);
        setActor();
        var preview = billing.preview(invoice.id());
        assertThat(preview.previousAmount()).isEqualByComparingTo(originalAutomatic);
        assertThat(preview.newAmount()).isEqualByComparingTo("47620");
        assertThat(preview.difference()).isEqualByComparingTo("-2380");
        var changed = billing.reconcile(invoice.id(), new Reconcile("Вычет за день болезни"), null);
        assertThat(changed.difference()).isEqualByComparingTo("-2380");
        assertThat(finance.account(child.id()).balance()).isEqualByComparingTo(new BigDecimal("47620").add(manual));
        assertThat(billing.reconcile(invoice.id(), new Reconcile("Повторная сверка"), null).difference()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(jdbc.queryForObject("select sum(amount) from account_entry where invoice_id=? and type='ADJUSTMENT'", BigDecimal.class, invoice.id()))
                .isEqualByComparingTo(manual);

        var report = request("GET", "/reports/billing?month=2026-11", null, adminToken, 200);
        JsonNode row = java.util.stream.StreamSupport.stream(report.path("rows").spliterator(), false)
                .filter(item -> item.path("childId").asLong() == child.id()).findFirst().orElseThrow();
        assertThat(row.path("charged").decimalValue()).isEqualByComparingTo(new BigDecimal("47620").add(manual));
        assertThat(row.path("balance").decimalValue()).isEqualByComparingTo(new BigDecimal("47620").add(manual));
    }

    @Test
    void teacherSeesOnlyAssignedRosterAndNoFinanceOrContactsAndPasswordChangeInvalidatesOldToken() throws Exception {
        var child = child();
        var other = child();
        String login = "teacher-" + UUID.randomUUID() + "@test.invalid";
        var teacher = request("POST", "/users", new CreateUser(login, "TeacherPass2026!"), adminToken, 200);
        var teacherLogin = request("POST", "/auth/login", new Login(login, "TeacherPass2026!"), null, 200);
        String old = teacherLogin.path("accessToken").asText();
        request("GET", "/teacher/groups", null, old, 403);
        request("POST", "/auth/change-password", new ChangePassword("TeacherPass2026!", "TeacherNew2026!"), old, 204);
        request("GET", "/me", null, old, 401);
        var logged = request("POST", "/auth/login", new Login(login, "TeacherNew2026!"), null, 200);
        String token = logged.path("accessToken").asText();
        request("POST", "/groups/" + child.groupId() + "/teacher-assignments",
                new CreateAssignment(teacher.path("id").asLong(), LocalDate.of(2026, 11, 1), null), adminToken, 200);
        var roster = request("GET", "/groups/" + child.groupId() + "/attendance?date=2026-11-09", null, token, 200);
        assertThat(roster.toString()).doesNotContain("contacts", "birthDate", "balance", "phone");
        request("GET", "/groups/" + other.groupId() + "/attendance?date=2026-11-09", null, token, 403);
        request("GET", "/children/" + child.id() + "/account", null, token, 403);
        request("GET", "/children/" + child.id(), null, token, 403);
        request("PUT", "/groups/" + child.groupId() + "/attendance?date=2026-11-06", "{\"items\":[]}", token, 403);
        request("PATCH", "/users/" + teacher.path("id").asLong(), new UpdateUser(login, false, teacher.path("version").asLong() + 1), adminToken, 200);
        request("GET", "/me", null, token, 401);
    }

    @Test
    void attendanceSaveIsAtomicAndStaleVersionConflictsAndIllnessNeedsExplicitPresentOverride() throws Exception {
        var child = child();
        String path = "/groups/" + child.groupId() + "/attendance?date=2026-11-02";
        String mark = "{\"childId\":" + child.id() + ",\"status\":\"PRESENT\",\"version\":null}";
        request("PUT", path, "{\"items\":[" + mark + ",{\"childId\":999999999,\"status\":\"PRESENT\",\"version\":null}]}", adminToken, 404);
        assertThat(jdbc.queryForObject("select count(*) from attendance where child_id=?", Long.class, child.id())).isZero();
        var otherGroupChild = child();
        request("PUT", path, "{\"items\":[" + mark + ",{\"childId\":" + otherGroupChild.id()
                + ",\"status\":\"PRESENT\",\"version\":null}]}", adminToken, 422);
        // The first mark has already been flushed when the second item's group check fails.
        assertThat(jdbc.queryForObject("select count(*) from attendance where child_id=?", Long.class, child.id())).isZero();
        request("PUT", path, "{\"items\":[" + mark + "]}", adminToken, 200);
        request("PUT", path, "{\"items\":[" + mark + "]}", adminToken, 409);
        String illnessPath = "/children/" + child.id() + "/illness-certificates";
        String certificate = "\"dateFrom\":\"2026-11-02\",\"dateTo\":\"2026-11-02\",\"receivedOn\":\"2026-11-03\"";
        var conflict = request("POST", illnessPath, "{" + certificate + "}", adminToken, 409);
        assertThat(conflict.path("code").asText()).isEqualTo("ATTENDANCE_CONFLICT");
        request("POST", illnessPath, "{" + certificate + ",\"confirmAttendanceOverride\":true}", adminToken, 200);
        assertThat(jdbc.queryForObject("select status from attendance where child_id=? and date='2026-11-02'", String.class, child.id())).isEqualTo("ABSENT");
    }

    @Test
    void postgresConstraintsRejectOverlappingMembershipAndTariffAndInvalidPayment() {
        var child = child();
        assertThatThrownBy(() -> jdbc.update("insert into child_group_membership(child_id,group_id,valid_from) values(?,?,date '2026-10-01')", child.id(), child.groupId()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("insert into tariff_version(age_from,age_to_exclusive,monthly_amount,valid_from) values(1,3,100,date '2026-01-01')"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("insert into payment(child_id,amount,paid_on,method,created_by) values(?,-1,current_date,'CASH',?)", child.id(), adminId))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void concurrentIdenticalIdempotencyKeysCreateOnePayment() throws Exception {
        var child = child();
        UUID key = UUID.randomUUID();
        var request = new CreatePayment(child.id(), new BigDecimal("1234"), LocalDate.of(2026, 11, 9), Method.TRANSFER, "Повтор запроса");
        var results = concurrent(() -> finance.pay(request, key));
        assertThat(results.getFirst()).isEqualTo(results.getLast());
        assertThat(jdbc.queryForObject("select count(*) from payment where child_id=?", Long.class, child.id())).isEqualTo(1);
        assertThat(finance.account(child.id()).credit()).isEqualByComparingTo("1234");
    }

    @Test
    void failedFinancialRequestRollsBackIdempotencyRecordAndCanBeRetriedAfterFunding() {
        var child = child();
        UUID key = UUID.randomUUID();
        var refund = new Refund(new BigDecimal("1000"), LocalDate.of(2026, 11, 9), "Возврат после пополнения");
        assertThatThrownBy(() -> finance.refund(child.id(), refund, key)).isInstanceOf(kz.kindergarten.common.ApiException.class);
        assertThat(jdbc.queryForObject("select count(*) from idempotency_request where request_key=?", Long.class, key)).isZero();
        finance.pay(new CreatePayment(child.id(), new BigDecimal("1000"), LocalDate.of(2026, 11, 9), Method.CASH, ""), null);
        assertThat(finance.refund(child.id(), refund, key).balance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(finance.refund(child.id(), refund, key).balance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(jdbc.queryForObject("select count(*) from account_entry where child_id=? and type='REFUND'", Long.class, child.id())).isEqualTo(1);
    }

    @Test
    void extendingWithdrawalAlsoExtendsTheMembershipThatItClosed() {
        var child = child();
        var withdrawn = children.withdrawal(child.id(), new Withdrawal(LocalDate.of(2026, 11, 6), child.version()));
        var extended = children.withdrawal(child.id(), new Withdrawal(LocalDate.of(2026, 11, 9), withdrawn.version()));
        assertThat(children.memberships(child.id()).getLast().validTo()).isEqualTo(LocalDate.of(2026, 11, 9));
        children.withdrawal(child.id(), new Withdrawal(null, extended.version()));
        assertThat(children.memberships(child.id()).getLast().validTo()).isNull();
    }

    @Test
    void calendarFirstPersistedRevisionRejectsAnotherEditBasedOnDefaultVersion() throws Exception {
        var initial = request("GET", "/calendar/2031/1", null, adminToken, 200);
        long defaultVersion = initial.path("days").get(0).path("version").asLong();
        String update = "{\"days\":[{\"date\":\"2031-01-01\",\"baseWorking\":false,\"closed\":false,\"reason\":\"Праздник\",\"version\":" + defaultVersion + "}]}";
        var saved = request("PUT", "/calendar/2031/1", update, adminToken, 200);
        assertThat(saved.path("days").get(0).path("version").asLong()).isGreaterThan(defaultVersion);
        request("PUT", "/calendar/2031/1", update, adminToken, 409);
    }

    private <T> List<T> concurrent(Callable<T> operation) throws Exception {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var ready = new CountDownLatch(2);
            var start = new CountDownLatch(1);
            Callable<T> task = () -> {
                setActor();
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Barrier timeout");
                try { return operation.call(); }
                finally { SecurityContextHolder.clearContext(); }
            };
            var first = executor.submit(task);
            var second = executor.submit(task);
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
        }
    }
}
