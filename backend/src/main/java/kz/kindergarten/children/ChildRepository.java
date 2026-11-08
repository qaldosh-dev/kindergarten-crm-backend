package kz.kindergarten.children;

import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ChildRepository extends JpaRepository<ChildEntity,Long>, JpaSpecificationExecutor<ChildEntity> {
    @Query(value="select * from child where id=:id for update",nativeQuery=true)
    Optional<ChildEntity> lock(@Param("id") long id);

    @Query("select c.id from ChildEntity c where c.admissionDate<=:to and (c.withdrawalDate is null or c.withdrawalDate>=:from) order by c.id")
    java.util.List<Long> enrolledInMonth(@Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);
}
