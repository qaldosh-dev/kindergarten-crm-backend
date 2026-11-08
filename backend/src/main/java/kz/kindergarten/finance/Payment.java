package kz.kindergarten.finance;

import jakarta.persistence.*;
import java.time.*;
import java.math.BigDecimal;
import kz.kindergarten.common.*;
import kz.kindergarten.auth.UserEntity;
import kz.kindergarten.children.ChildEntity;

@Entity
@Table(name = "payment")
public class Payment extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    private BigDecimal amount;

    private LocalDate paidOn;

    private String method;

    private String comment = "";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by")
    private UserEntity createdBy;

    private Instant cancelledAt;

    private String cancellationReason;

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal value) {
        this.amount = value;
    }

    public LocalDate getPaidOn() {
        return paidOn;
    }

    public void setPaidOn(LocalDate value) {
        this.paidOn = value;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String value) {
        this.method = value;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String value) {
        this.comment = value;
    }

    public UserEntity getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UserEntity value) {
        this.createdBy = value;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(Instant value) {
        this.cancelledAt = value;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String value) {
        this.cancellationReason = value;
    }
}
