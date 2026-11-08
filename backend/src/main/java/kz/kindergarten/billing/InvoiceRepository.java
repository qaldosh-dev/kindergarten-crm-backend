package kz.kindergarten.billing;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
    @Override
    @EntityGraph(attributePaths = "child")
    org.springframework.data.domain.Page<Invoice> findAll(org.springframework.data.jpa.domain.Specification<Invoice> filter,
                                                          org.springframework.data.domain.Pageable pageable);

    Optional<Invoice> findByChildIdAndMonth(long childId, LocalDate month);

    @Modifying
    @Query("update Invoice i set i.needsReconciliation=true, i.version=i.version+1 where i.status='ISSUED' and (:childId is null or i.child.id=:childId)")
    void markStale(@org.springframework.data.repository.query.Param("childId") Long childId);
}
