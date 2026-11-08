package kz.kindergarten.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import kz.kindergarten.finance.PaymentAllocator.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PaymentAllocatorTest {
    private final PaymentAllocator allocator = new PaymentAllocator();
    private final LocalDate day = LocalDate.of(2026, 11, 1);

    @Test
    void oldestChargesAndPaymentsAreOrderedByDateThenId() {
        var result = allocator.allocate(List.of(new Charge(2, day.plusDays(1), new BigDecimal("100")), new Charge(1, day, new BigDecimal("100"))),
                List.of(new Funds(9, day, new BigDecimal("150"))), BigDecimal.ZERO, BigDecimal.ZERO);
        assertThat(result).containsExactly(new Allocation(9, 1, new BigDecimal("100")), new Allocation(9, 2, new BigDecimal("50")));
    }

    @Test
    void negativeCorrectionsFreeFundsAndCreditPaysNextCharge() {
        var result = allocator.allocate(List.of(new Charge(2, day, new BigDecimal("100"))),
                List.of(new Funds(9, day, new BigDecimal("100"))), new BigDecimal("40"), BigDecimal.ZERO);
        assertThat(result).containsExactly(new Allocation(9, 2, new BigDecimal("60")));
    }

    @Test
    void refundConsumesAvailableCreditBeforeCash() {
        var result = allocator.allocate(List.of(new Charge(1, day, new BigDecimal("50"))),
                List.of(new Funds(9, day, new BigDecimal("100"))), new BigDecimal("20"), new BigDecimal("50"));
        assertThat(result).containsExactly(new Allocation(9, 1, new BigDecimal("50")));
    }

    @Test
    void cancellationRemovesPaymentFromRebuiltDistribution() {
        assertThat(allocator.allocate(List.of(new Charge(1, day, new BigDecimal("100"))), List.of(), BigDecimal.ZERO, BigDecimal.ZERO)).isEmpty();
    }

    @Test
    void overpaymentRemainsUnallocatedAndNoNegativeAllocationIsProduced() {
        var result = allocator.allocate(List.of(new Charge(1, day, new BigDecimal("10"))),
                List.of(new Funds(2, day, new BigDecimal("100"))), BigDecimal.ZERO, BigDecimal.ZERO);
        assertThat(result).containsExactly(new Allocation(2, 1, new BigDecimal("10")));
    }
}
