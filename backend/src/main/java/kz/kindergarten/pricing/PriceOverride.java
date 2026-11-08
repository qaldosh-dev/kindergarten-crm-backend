package kz.kindergarten.pricing;

import jakarta.persistence.*;
import java.time.*;
import java.math.BigDecimal;
import kz.kindergarten.common.*;
import kz.kindergarten.children.ChildEntity;

@Entity
@Table(name = "child_price_override")
public class PriceOverride extends VersionedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    private BigDecimal monthlyAmount;

    private LocalDate validFrom;

    private LocalDate validTo;

    private String reason;

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public BigDecimal getMonthlyAmount() {
        return monthlyAmount;
    }

    public void setMonthlyAmount(BigDecimal value) {
        this.monthlyAmount = value;
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

    public String getReason() {
        return reason;
    }

    public void setReason(String value) {
        this.reason = value;
    }
}
