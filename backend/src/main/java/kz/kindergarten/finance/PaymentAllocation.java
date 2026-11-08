package kz.kindergarten.finance;

import jakarta.persistence.*;
import java.math.BigDecimal;
import kz.kindergarten.common.*;
import kz.kindergarten.finance.Payment;
import kz.kindergarten.finance.LedgerEntry;

@Entity
@Table(name = "payment_allocation")
public class PaymentAllocation extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_entry_id")
    private LedgerEntry chargeEntry;

    private BigDecimal amount;

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment value) {
        this.payment = value;
    }

    public LedgerEntry getChargeEntry() {
        return chargeEntry;
    }

    public void setChargeEntry(LedgerEntry value) {
        this.chargeEntry = value;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal value) {
        this.amount = value;
    }
}
