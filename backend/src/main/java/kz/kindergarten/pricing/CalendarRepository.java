package kz.kindergarten.pricing;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarRepository extends JpaRepository<CalendarDay, LocalDate> {
    List<CalendarDay> findByDateBetweenOrderByDate(LocalDate from, LocalDate to);
}
