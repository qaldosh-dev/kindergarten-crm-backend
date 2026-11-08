package kz.kindergarten.children;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRepository extends JpaRepository<ChildContact, Long> {
    List<ChildContact> findByChildIdOrderById(long childId);
    List<ChildContact> findByChildIdIn(List<Long> childIds);
    void deleteByChildId(long childId);
}
