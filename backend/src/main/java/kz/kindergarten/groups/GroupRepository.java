package kz.kindergarten.groups;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;

public interface GroupRepository extends JpaRepository<GroupEntity, Long> {
    Page<GroupEntity> findByActive(boolean active, Pageable pageable);
}
