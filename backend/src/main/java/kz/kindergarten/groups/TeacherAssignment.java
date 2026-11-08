package kz.kindergarten.groups;

import jakarta.persistence.*;
import java.time.*;
import kz.kindergarten.common.*;
import kz.kindergarten.auth.UserEntity;
import kz.kindergarten.groups.GroupEntity;

@Entity
@Table(name = "teacher_assignment")
public class TeacherAssignment extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id")
    private UserEntity teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id")
    private GroupEntity group;

    private LocalDate validFrom;

    private LocalDate validTo;

    public UserEntity getTeacher() {
        return teacher;
    }

    public void setTeacher(UserEntity value) {
        this.teacher = value;
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
