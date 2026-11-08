package kz.kindergarten.illness;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface IllnessRepository extends JpaRepository<IllnessCertificate, Long> {
    Page<IllnessCertificate> findByChildId(long childId, Pageable pageable);

    @Query("select c from IllnessCertificate c where c.child.id=:childId and c.revokedAt is null and c.dateFrom<=:to and c.dateTo>=:from")
    List<IllnessCertificate> effective(@Param("childId") long childId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
