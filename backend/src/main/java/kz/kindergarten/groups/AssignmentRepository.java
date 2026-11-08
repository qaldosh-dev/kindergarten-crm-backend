package kz.kindergarten.groups;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface AssignmentRepository extends JpaRepository<TeacherAssignment, Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TeacherAssignment a where a.id=:id")
    java.util.Optional<TeacherAssignment> lock(@Param("id") long id);

    @EntityGraph(attributePaths = {"teacher", "group"})
    List<TeacherAssignment> findByGroupIdOrderByValidFromAscIdAsc(long groupId);

    @Query("select count(a) > 0 from TeacherAssignment a where a.teacher.id=:teacher and a.group.id=:groupId and a.validFrom<=:date and (a.validTo is null or a.validTo>=:date)")
    boolean assigned(@Param("teacher") long teacher, @Param("groupId") long groupId, @Param("date") LocalDate date);

    @Query("select distinct a.group from TeacherAssignment a where a.teacher.id=:teacher and a.validFrom<=:date and (a.validTo is null or a.validTo>=:date) order by a.group.name")
    List<GroupEntity> groupsForTeacher(@Param("teacher") long teacher, @Param("date") LocalDate date);
}
