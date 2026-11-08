package kz.kindergarten.finance;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class FinanceDtos {
    private FinanceDtos() {}

    public enum Method { CASH, TRANSFER }
    public record CreatePayment(@NotNull Long childId, @NotNull @Positive @Digits(integer = 15, fraction = 0) BigDecimal amount,
                                @NotNull LocalDate paidOn, @NotNull Method method, @Size(max = 10000) String comment) {}
    public record Reason(@NotBlank @Size(max = 10000) String reason) {}
    public record OpeningBalance(@NotNull @Digits(integer = 15, fraction = 0) BigDecimal amount,
                                 @NotBlank @Size(max = 10000) String reason) {}
    public record Adjustment(@NotNull @Digits(integer = 15, fraction = 0) BigDecimal amount,
                             @NotBlank @Size(max = 10000) String reason, Long invoiceId) {}
    public record Refund(@NotNull @Positive @Digits(integer = 15, fraction = 0) BigDecimal amount,
                         @NotNull LocalDate paidOn, @NotBlank @Size(max = 10000) String reason) {}
    public record PaymentView(Long id, Long childId, String childName, BigDecimal amount, LocalDate paidOn,
                              String method, String comment, Instant cancelledAt, String cancellationReason) {}
    public record EntryView(Long id, String type, BigDecimal amount, Instant createdAt, String reason, Long invoiceId, Long paymentId) {}
    public record Account(long childId, BigDecimal balance, BigDecimal debt, BigDecimal credit,
                          List<EntryView> entries, List<PaymentView> payments) {}
}
