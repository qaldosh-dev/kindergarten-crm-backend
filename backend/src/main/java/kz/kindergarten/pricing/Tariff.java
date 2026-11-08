package kz.kindergarten.pricing;

import jakarta.persistence.*;
import java.time.*;
import java.math.BigDecimal;
import kz.kindergarten.common.*;

@Entity
@Table(name = "tariff_version")
public class Tariff extends VersionedEntity {
    private int ageFrom;

    private Integer ageToExclusive;

    private BigDecimal monthlyAmount;

    private LocalDate validFrom;

    private LocalDate validTo;

    public int getAgeFrom() {
        return ageFrom;
    }

    public void setAgeFrom(int value) {
        this.ageFrom = value;
    }

    public Integer getAgeToExclusive() {
        return ageToExclusive;
    }

    public void setAgeToExclusive(Integer value) {
        this.ageToExclusive = value;
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
}
