package kz.kindergarten.reports;

import java.math.BigDecimal;
import java.time.YearMonth;
import kz.kindergarten.common.BusinessTime;
import kz.kindergarten.reports.ReportDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {
    private final ReportRepository reports;
    private final BusinessTime time;

    public ReportService(ReportRepository reports, BusinessTime time) {
        this.reports = reports;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public BillingReport billing(YearMonth month) {
        var rows = reports.billing(month, time.today());
        BigDecimal charged = BigDecimal.ZERO;
        BigDecimal paid = BigDecimal.ZERO;
        BigDecimal refunded = BigDecimal.ZERO;
        BigDecimal debt = BigDecimal.ZERO;
        BigDecimal credit = BigDecimal.ZERO;
        for (BillingRow row : rows) {
            charged = charged.add(row.charged());
            paid = paid.add(row.paid());
            refunded = refunded.add(row.refunded());
            debt = debt.add(row.debt());
            credit = credit.add(row.credit());
        }
        return new BillingReport(month, charged, paid, refunded, debt, credit, rows);
    }

    public String csv(YearMonth month) {
        var report = billing(month);
        var csv = new StringBuilder("\uFEFFРебёнок,Группа,Начислено,Оплачено,Возвращено,Текущий баланс,Долг,Переплата,Требует сверки\r\n");
        for (BillingRow row : report.rows()) {
            csv.append(csvText(row.childName())).append(',').append(csvText(row.groupName())).append(',')
                    .append(row.charged()).append(',').append(row.paid()).append(',').append(row.refunded()).append(',')
                    .append(row.balance()).append(',').append(row.debt()).append(',').append(row.credit()).append(',')
                    .append(row.needsReconciliation() ? "Да" : "Нет").append("\r\n");
        }
        return csv.toString();
    }

    static String csvText(String value) {
        String text = value == null ? "" : value;
        String stripped = text.stripLeading();
        if (!stripped.isEmpty() && "=+-@".indexOf(stripped.charAt(0)) >= 0 || text.startsWith("\t") || text.startsWith("\r")) {
            text = "'" + text;
        }
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}
