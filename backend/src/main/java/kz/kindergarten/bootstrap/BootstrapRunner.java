package kz.kindergarten.bootstrap;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import kz.kindergarten.billing.*;
import kz.kindergarten.billing.BillingDtos.*;
import kz.kindergarten.common.BusinessTime;
import kz.kindergarten.finance.*;
import kz.kindergarten.finance.FinanceDtos.*;
import kz.kindergarten.illness.*;
import kz.kindergarten.illness.IllnessDtos.ConfirmIllness;
import org.springframework.boot.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class BootstrapRunner implements ApplicationRunner {
    private final BootstrapService bootstrap;
    private final BillingService billing;
    private final FinanceService finance;
    private final IllnessService illness;
    private final BusinessTime time;

    public BootstrapRunner(BootstrapService bootstrap, BillingService billing, FinanceService finance, IllnessService illness, BusinessTime time) {
        this.bootstrap = bootstrap;
        this.billing = billing;
        this.finance = finance;
        this.illness = illness;
        this.time = time;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        var result = bootstrap.initialize();
        if (!result.seedFinance()) {
            return;
        }
        var token = Jwt.withTokenValue("internal-demo-bootstrap").header("alg", "HS256")
                .subject(result.adminId().toString()).claim("login", "admin@demo.local").claim("role", "ADMIN").build();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new JwtAuthenticationToken(token, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        SecurityContextHolder.setContext(context);
        try {
            YearMonth month = YearMonth.from(time.today());
            for (long childId : result.childIds()) {
                var draft = billing.draft(childId, month);
                var invoice = billing.get(draft.invoiceId());
                billing.issue(invoice.id(), new Issue(invoice.version(), time.today().plusDays(7)), null);
            }
            long debtChild = result.childIds().getFirst();
            finance.opening(debtChild, new OpeningBalance(new BigDecimal("12000"), "Демо: долг до запуска системы"), null);
            finance.pay(new CreatePayment(debtChild, new BigDecimal("20000"), time.today(), Method.CASH, "Демо: частичная оплата"), null);
            finance.pay(new CreatePayment(result.childIds().get(1), new BigDecimal("80000"), time.today(), Method.TRANSFER, "Демо: аванс"), null);

            // A previous-month invoice demonstrates late illness and an append-only reconciliation.
            long illnessChild = result.childIds().get(2);
            YearMonth previousMonth = month.minusMonths(1);
            var draft = billing.draft(illnessChild, previousMonth);
            var invoice = billing.get(draft.invoiceId());
            billing.issue(invoice.id(), new Issue(invoice.version(), time.today().plusDays(7)), null);
            LocalDate illnessDate = previousMonth.atDay(1).with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
            illness.confirm(illnessChild, new ConfirmIllness(illnessDate, illnessDate.plusDays(2), illnessDate.plusDays(3), "Демо: поздняя справка принята администратором", false));
            billing.reconcile(invoice.id(), new Reconcile("Демо: вычет по подтверждённой справке"), null);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
