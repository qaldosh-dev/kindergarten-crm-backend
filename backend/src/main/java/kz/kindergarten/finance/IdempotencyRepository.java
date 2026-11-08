package kz.kindergarten.finance;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdempotencyRepository extends JpaRepository<IdempotencyRequest, UUID> {}
