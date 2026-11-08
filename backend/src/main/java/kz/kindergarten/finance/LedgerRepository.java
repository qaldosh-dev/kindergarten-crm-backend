package kz.kindergarten.finance;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface LedgerRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByChildIdOrderByPaidOnAscIdAsc(long childId);
    Page<LedgerEntry> findByChildId(long childId, Pageable pageable);
    boolean existsByChildIdAndType(long childId, String type);

    @Query("select coalesce(sum(e.amount),0) from LedgerEntry e where e.child.id=:childId")
    BigDecimal balance(@Param("childId") long childId);

    @Query("select coalesce(sum(e.amount),0) from LedgerEntry e where e.invoice.id=:invoiceId")
    BigDecimal invoiceTotal(@Param("invoiceId") long invoiceId);

    @Query("select coalesce(sum(e.amount),0) from LedgerEntry e where e.invoice.id=:invoiceId and e.type in ('CHARGE','RECONCILIATION')")
    BigDecimal automaticInvoiceTotal(@Param("invoiceId") long invoiceId);
}
