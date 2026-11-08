package kz.kindergarten.common;

import jakarta.persistence.*;

@MappedSuperclass
public abstract class PersistentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    protected Long id;

    public Long getId() {
        return id;
    }
}
