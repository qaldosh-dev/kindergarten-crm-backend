package kz.kindergarten.children;

import jakarta.persistence.*;
import java.time.*;
import kz.kindergarten.common.*;

@Entity
@Table(name = "child")
public class ChildEntity extends VersionedEntity {
    private String fullName;

    private LocalDate birthDate;

    private LocalDate admissionDate;

    private LocalDate withdrawalDate;

    private String comment = "";

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String value) {
        this.fullName = value;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate value) {
        this.birthDate = value;
    }

    public LocalDate getAdmissionDate() {
        return admissionDate;
    }

    public void setAdmissionDate(LocalDate value) {
        this.admissionDate = value;
    }

    public LocalDate getWithdrawalDate() {
        return withdrawalDate;
    }

    public void setWithdrawalDate(LocalDate value) {
        this.withdrawalDate = value;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String value) {
        this.comment = value;
    }
}
