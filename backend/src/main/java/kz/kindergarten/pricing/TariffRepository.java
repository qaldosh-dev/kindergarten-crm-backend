package kz.kindergarten.pricing;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface TariffRepository extends JpaRepository<Tariff, Long> {
    @Query("select t from Tariff t where t.validFrom<=:to and (t.validTo is null or t.validTo>=:from) order by t.validFrom,t.id")
    List<Tariff> overlapping(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
