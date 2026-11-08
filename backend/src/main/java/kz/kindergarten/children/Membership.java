package kz.kindergarten.children;

import jakarta.persistence.*;
import java.time.*;
import kz.kindergarten.common.*;
import kz.kindergarten.groups.GroupEntity;
import kz.kindergarten.children.ChildEntity;

@Entity
@Table(name = "child_group_membership")
public class Membership extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id")
    private GroupEntity group;

    private LocalDate validFrom;

    private LocalDate validTo;

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public GroupEntity getGroup() {
        return group;
    }

    public void setGroup(GroupEntity value) {
        this.group = value;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(LocalDate value) {
        this.validFrom = value;
    }

    public LocalDate getValidTo() {
        return validTo;
    }

    public void setValidTo(LocalDate value) {
        this.validTo = value;
    }
}
