package kz.kindergarten.finance;

import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface AllocationRepository extends JpaRepository<PaymentAllocation, Long> {
    @Modifying
    @Query("delete from PaymentAllocation a where a.payment.child.id=:childId")
    void deleteForChild(@Param("childId") long childId);
    List<PaymentAllocation> findByPaymentId(long paymentId);
}
