package kz.kindergarten.groups;

import jakarta.persistence.*;
import kz.kindergarten.common.*;

@Entity
@Table(name = "kindergarten_group")
public class GroupEntity extends VersionedEntity {
    private String name;

    private boolean active = true;

    public String getName() {
        return name;
    }

    public void setName(String value) {
        this.name = value;
    }

    public boolean getActive() {
        return active;
    }

    public void setActive(boolean value) {
        this.active = value;
    }
}
