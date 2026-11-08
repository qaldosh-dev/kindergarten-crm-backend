package kz.kindergarten.children;

import jakarta.persistence.*;
import kz.kindergarten.common.*;
import kz.kindergarten.children.ChildEntity;

@Entity
@Table(name = "child_contact")
public class ChildContact extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    private String representativeName;

    private String phone;

    private String relation;

    private String comment = "";

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public String getRepresentativeName() {
        return representativeName;
    }

    public void setRepresentativeName(String value) {
        this.representativeName = value;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String value) {
        this.phone = value;
    }

    public String getRelation() {
        return relation;
    }

    public void setRelation(String value) {
        this.relation = value;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String value) {
        this.comment = value;
    }
}
