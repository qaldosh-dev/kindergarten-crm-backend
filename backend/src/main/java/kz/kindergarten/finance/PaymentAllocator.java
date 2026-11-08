package kz.kindergarten.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Component;

/** Rebuildable FIFO distribution. The immutable signed ledger remains the balance authority. */
@Component
public class PaymentAllocator {
    public record Charge(long entryId, LocalDate date, BigDecimal amount) {}
    public record Funds(long paymentId, LocalDate date, BigDecimal amount) {}
    public record Allocation(long paymentId, long chargeEntryId, BigDecimal amount) {}

    public List<Allocation> allocate(List<Charge> charges, List<Funds> payments, BigDecimal generalCredit, BigDecimal refunded) {
        var orderedCharges = new ArrayList<>(charges);
        orderedCharges.sort(Comparator.comparing(Charge::date).thenComparingLong(Charge::entryId));
        var orderedPayments = new ArrayList<>(payments);
        orderedPayments.sort(Comparator.comparing(Funds::date).thenComparingLong(Funds::paymentId));
        List<BigDecimal> remainingCharges = orderedCharges.stream().map(Charge::amount).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        List<BigDecimal> remainingFunds = orderedPayments.stream().map(Funds::amount).collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        // A refund first consumes credit created by negative corrections, then unallocated cash.
        BigDecimal credit = generalCredit.subtract(refunded).max(BigDecimal.ZERO);
        BigDecimal cashRefund = refunded.subtract(generalCredit).max(BigDecimal.ZERO);
        for (int index = remainingFunds.size() - 1; index >= 0 && cashRefund.signum() > 0; index--) {
            BigDecimal used = remainingFunds.get(index).min(cashRefund);
            remainingFunds.set(index, remainingFunds.get(index).subtract(used));
            cashRefund = cashRefund.subtract(used);
        }
        for (int index = 0; index < remainingCharges.size() && credit.signum() > 0; index++) {
            BigDecimal used = remainingCharges.get(index).min(credit);
            remainingCharges.set(index, remainingCharges.get(index).subtract(used));
            credit = credit.subtract(used);
        }

        List<Allocation> result = new ArrayList<>();
        int chargeIndex = 0;
        for (int paymentIndex = 0; paymentIndex < orderedPayments.size(); paymentIndex++) {
            BigDecimal available = remainingFunds.get(paymentIndex);
            while (available.signum() > 0 && chargeIndex < orderedCharges.size()) {
                BigDecimal unpaid = remainingCharges.get(chargeIndex);
                if (unpaid.signum() == 0) {
                    chargeIndex++;
                    continue;
                }
                BigDecimal applied = available.min(unpaid);
                result.add(new Allocation(orderedPayments.get(paymentIndex).paymentId(), orderedCharges.get(chargeIndex).entryId(), applied));
                available = available.subtract(applied);
                remainingCharges.set(chargeIndex, unpaid.subtract(applied));
            }
        }
        return List.copyOf(result);
    }
}
