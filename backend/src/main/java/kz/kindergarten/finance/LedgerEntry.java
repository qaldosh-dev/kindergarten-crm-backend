package kz.kindergarten.finance;

import jakarta.persistence.*;
import java.time.*;
import java.math.BigDecimal;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import kz.kindergarten.common.*;
import kz.kindergarten.auth.UserEntity;
import kz.kindergarten.children.ChildEntity;
import kz.kindergarten.billing.Invoice;
import kz.kindergarten.billing.BillingSnapshot;
import kz.kindergarten.finance.Payment;

@Entity
@Table(name = "account_entry")
public class LedgerEntry extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private ChildEntity child;

    private String type;

    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private LocalDate paidOn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by")
    private UserEntity createdBy;

    private Instant createdAt;

    private String reason = "";

    @JdbcTypeCode(SqlTypes.JSON)
    private BillingSnapshot calculationSnapshot;

    public ChildEntity getChild() {
        return child;
    }

    public void setChild(ChildEntity value) {
        this.child = value;
    }

    public String getType() {
        return type;
    }

    public void setType(String value) {
        this.type = value;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal value) {
        this.amount = value;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice value) {
        this.invoice = value;
    }

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment value) {
        this.payment = value;
    }

    public LocalDate getPaidOn() {
        return paidOn;
    }

    public void setPaidOn(LocalDate value) {
        this.paidOn = value;
    }

    public UserEntity getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UserEntity value) {
        this.createdBy = value;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant value) {
        this.createdAt = value;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String value) {
        this.reason = value;
    }

    public BillingSnapshot getCalculationSnapshot() {
        return calculationSnapshot;
    }

    public void setCalculationSnapshot(BillingSnapshot value) {
        this.calculationSnapshot = value;
    }
}
