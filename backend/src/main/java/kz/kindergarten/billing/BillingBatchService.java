package kz.kindergarten.billing;

import java.time.YearMonth;
import java.util.ArrayList;
import kz.kindergarten.billing.BillingDtos.*;
import kz.kindergarten.children.ChildRepository;
import kz.kindergarten.common.ApiException;
import org.springframework.stereotype.Service;

@Service
public class BillingBatchService {
    private final ChildRepository children;
    private final BillingService billing;

    public BillingBatchService(ChildRepository children, BillingService billing) {
        this.children = children;
        this.billing = billing;
    }

    public MonthCalculation calculate(YearMonth month) {
        var ids = children.enrolledInMonth(month.atDay(1), month.atEndOfMonth());
        var results = new ArrayList<CalculationResult>();
        for (long id : ids) {
            try {
                results.add(billing.draft(id, month));
            } catch (RuntimeException exception) {
                String name = children.findById(id).map(child -> child.getFullName()).orElse("");
                String message = exception instanceof ApiException ? exception.getMessage() : "Ошибка расчёта: проверьте данные и повторите";
                results.add(new CalculationResult(id, name, null, "ERROR", message));
            }
        }
        return new MonthCalculation(month, results);
    }
}
