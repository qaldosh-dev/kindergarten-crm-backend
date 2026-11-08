package kz.kindergarten.common;

import jakarta.persistence.*;

@MappedSuperclass
public abstract class VersionedEntity extends PersistentEntity {
    @Version
    protected Long version;

    public Long getVersion() {
        return version;
    }
}
