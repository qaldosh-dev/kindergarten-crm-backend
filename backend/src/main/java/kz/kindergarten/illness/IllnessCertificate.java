package kz.kindergarten.illness;

import jakarta.persistence.*;
import java.time.*;
import kz.kindergarten.common.*;
import kz.kindergarten.auth.UserEntity;
import kz.kindergarten.children.ChildEntity;

@Entity
@Table(name = "illness_certificate")
public class IllnessCertificate extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    private LocalDate dateFrom;

    private LocalDate dateTo;

    private LocalDate receivedOn;

    private Instant confirmedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "confirmed_by")
    private UserEntity confirmedBy;

    private String lateReason = "";

    private Instant revokedAt;

    private String revocationReason;

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public LocalDate getDateFrom() {
        return dateFrom;
    }

    public void setDateFrom(LocalDate value) {
        this.dateFrom = value;
    }

    public LocalDate getDateTo() {
        return dateTo;
    }

    public void setDateTo(LocalDate value) {
        this.dateTo = value;
    }

    public LocalDate getReceivedOn() {
        return receivedOn;
    }

    public void setReceivedOn(LocalDate value) {
        this.receivedOn = value;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(Instant value) {
        this.confirmedAt = value;
    }

    public UserEntity getConfirmedBy() {
        return confirmedBy;
    }

    public void setConfirmedBy(UserEntity value) {
        this.confirmedBy = value;
    }

    public String getLateReason() {
        return lateReason;
    }

    public void setLateReason(String value) {
        this.lateReason = value;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant value) {
        this.revokedAt = value;
    }

    public String getRevocationReason() {
        return revocationReason;
    }

    public void setRevocationReason(String value) {
        this.revocationReason = value;
    }
}
