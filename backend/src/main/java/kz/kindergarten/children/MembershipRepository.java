package kz.kindergarten.children;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface MembershipRepository extends JpaRepository<Membership, Long> {
    @EntityGraph(attributePaths = {"group"})
    List<Membership> findByChildIdOrderByValidFromAscIdAsc(long childId);

    @EntityGraph(attributePaths = {"group", "child"})
    List<Membership> findByChildIdIn(List<Long> childIds);

    @EntityGraph(attributePaths = {"group", "child"})
    @Query("select m from Membership m where m.group.id=:groupId and m.validFrom<=:date and (m.validTo is null or m.validTo>=:date) and m.child.admissionDate<=:date and (m.child.withdrawalDate is null or m.child.withdrawalDate>=:date) order by m.child.fullName,m.child.id")
    List<Membership> roster(@Param("groupId") long groupId, @Param("date") LocalDate date);

    @Query("select count(m)>0 from Membership m where m.child.id=:childId and m.group.id=:groupId and m.validFrom<=:date and (m.validTo is null or m.validTo>=:date)")
    boolean belongs(@Param("childId") long childId, @Param("groupId") long groupId, @Param("date") LocalDate date);
}
