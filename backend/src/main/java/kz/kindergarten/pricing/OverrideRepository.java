package kz.kindergarten.pricing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OverrideRepository extends JpaRepository<PriceOverride, Long> {
    List<PriceOverride> findByChildIdOrderByValidFromAsc(long childId);
}
