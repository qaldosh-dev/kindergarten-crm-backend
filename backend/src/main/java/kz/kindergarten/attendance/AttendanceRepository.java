package kz.kindergarten.attendance;

import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByChildIdAndDate(long childId, LocalDate date);

    @EntityGraph(attributePaths = {"updatedBy", "child"})
    List<Attendance> findByChildIdInAndDate(List<Long> childIds, LocalDate date);

    @EntityGraph(attributePaths = {"updatedBy"})
    List<Attendance> findByChildIdAndDateBetween(long childId, LocalDate from, LocalDate to);
    boolean existsByChildIdAndDateBefore(long childId, LocalDate date);
    boolean existsByChildIdAndDateAfter(long childId, LocalDate date);
}
