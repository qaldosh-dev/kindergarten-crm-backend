package kz.kindergarten.billing;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import kz.kindergarten.billing.BillingCalculator.Calculation;

public final class BillingDtos {
    private BillingDtos() {}

    public record InvoiceView(Long id, Long childId, String childName, YearMonth month, String status, LocalDate dueDate,
                              BigDecimal amount, Instant issuedAt, boolean needsReconciliation, Long version, Calculation calculation) {}
    public record Issue(@NotNull Long version, LocalDate dueDate) {}
    public record Reconcile(@NotBlank @Size(max = 10000) String reason) {}
    public record CalculationResult(Long childId, String childName, Long invoiceId, String status, String message) {}
    public record MonthCalculation(YearMonth month, List<CalculationResult> results) {}
    public record Preview(long invoiceId, BigDecimal previousAmount, BigDecimal newAmount, BigDecimal difference, Calculation calculation) {}
    public record Reconciliation(long invoiceId, BigDecimal previousAmount, BigDecimal newAmount, BigDecimal difference, Long entryId) {}
}
