package kz.kindergarten.billing;

import jakarta.persistence.*;
import java.time.*;
import java.math.BigDecimal;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import kz.kindergarten.common.*;
import kz.kindergarten.children.ChildEntity;
import kz.kindergarten.billing.BillingSnapshot;

@Entity
@Table(name = "invoice")
public class Invoice extends VersionedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    private LocalDate month;

    private String status = "DRAFT";

    private LocalDate dueDate;

    private Instant issuedAt;

    private BigDecimal amount;

    private boolean needsReconciliation;

    @JdbcTypeCode(SqlTypes.JSON)
    private BillingSnapshot calculationSnapshot;

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public LocalDate getMonth() {
        return month;
    }

    public void setMonth(LocalDate value) {
        this.month = value;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String value) {
        this.status = value;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate value) {
        this.dueDate = value;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant value) {
        this.issuedAt = value;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal value) {
        this.amount = value;
    }

    public boolean getNeedsReconciliation() {
        return needsReconciliation;
    }

    public void setNeedsReconciliation(boolean value) {
        this.needsReconciliation = value;
    }

    public BillingSnapshot getCalculationSnapshot() {
        return calculationSnapshot;
    }

    public void setCalculationSnapshot(BillingSnapshot value) {
        this.calculationSnapshot = value;
    }
}
