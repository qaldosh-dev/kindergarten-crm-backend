package kz.kindergarten.common;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;

/** Global source edits are rare; shared/exclusive transaction locks prevent issue/edit races. */
@Component
public class CalculationGate {
    private final EntityManager entityManager;

    public CalculationGate(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public void readSources() {
        entityManager.createNativeQuery("select 1 from pg_advisory_xact_lock_shared(715031)").getSingleResult();
    }

    public void changeGlobalSources() {
        entityManager.createNativeQuery("select 1 from pg_advisory_xact_lock(715031)").getSingleResult();
    }
}
