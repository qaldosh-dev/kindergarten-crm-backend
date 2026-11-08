package kz.kindergarten.pricing;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CalendarRepository extends JpaRepository<CalendarDay, LocalDate> {
    List<CalendarDay> findByDateBetweenOrderByDate(LocalDate from, LocalDate to);

    @Modifying
    @Query("update CalendarDay day set day.version = day.version + 1 where day.date = :date")
    void advanceInitialRevision(@Param("date") LocalDate date);
}
