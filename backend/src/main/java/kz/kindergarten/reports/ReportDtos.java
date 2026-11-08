package kz.kindergarten.reports;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

public final class ReportDtos {
    private ReportDtos() {}

    public record BillingRow(long childId, String childName, String groupName, BigDecimal charged, BigDecimal paid,
                             BigDecimal refunded, BigDecimal balance, BigDecimal debt, BigDecimal credit, boolean needsReconciliation) {}
    public record BillingReport(YearMonth month, BigDecimal totalCharged, BigDecimal totalPaid, BigDecimal totalRefunded,
                                BigDecimal totalDebt, BigDecimal totalCredit, List<BillingRow> rows) {}
}
