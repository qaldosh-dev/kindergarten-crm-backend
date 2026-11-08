package kz.kindergarten.finance;

import java.util.List;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {
    @Override
    @EntityGraph(attributePaths = "child")
    Page<Payment> findAll(org.springframework.data.jpa.domain.Specification<Payment> filter, Pageable pageable);

    @EntityGraph(attributePaths = "child")
    List<Payment> findByChildIdAndCancelledAtIsNullOrderByPaidOnAscIdAsc(long childId);
    @EntityGraph(attributePaths = "child")
    Page<Payment> findByChildId(long childId, Pageable pageable);
}
