package kz.kindergarten.attendance;

import jakarta.persistence.*;
import java.time.*;
import kz.kindergarten.common.*;
import kz.kindergarten.auth.UserEntity;
import kz.kindergarten.children.ChildEntity;

@Entity
@Table(name = "attendance")
public class Attendance extends VersionedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    private LocalDate date;

    private String status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "updated_by")
    private UserEntity updatedBy;

    private Instant updatedAt;

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate value) {
        this.date = value;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String value) {
        this.status = value;
    }

    public UserEntity getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(UserEntity value) {
        this.updatedBy = value;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant value) {
        this.updatedAt = value;
    }
}
