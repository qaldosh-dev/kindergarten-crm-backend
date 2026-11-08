package kz.kindergarten.billing;

import java.time.YearMonth;
import kz.kindergarten.billing.BillingCalculator.*;
import kz.kindergarten.children.ChildEntity;
import kz.kindergarten.illness.IllnessRepository;
import kz.kindergarten.pricing.*;
import org.springframework.stereotype.Service;

@Service
public class CalculationSourceService {
    private final CalendarRepository calendar;
    private final TariffRepository tariffs;
    private final OverrideRepository overrides;
    private final IllnessRepository illnesses;
    private final BillingCalculator calculator;

    public CalculationSourceService(CalendarRepository calendar, TariffRepository tariffs, OverrideRepository overrides,
                                     IllnessRepository illnesses, BillingCalculator calculator) {
        this.calendar = calendar;
        this.tariffs = tariffs;
        this.overrides = overrides;
        this.illnesses = illnesses;
        this.calculator = calculator;
    }

    public BillingSnapshot calculate(ChildEntity child, YearMonth month) {
        var days = calendar.findByDateBetweenOrderByDate(month.atDay(1), month.atEndOfMonth()).stream()
                .map(day -> new DayRule(day.getDate(), day.getBaseWorking(), day.getClosed())).toList();
        var prices = tariffs.overlapping(month.atDay(1), month.atEndOfMonth()).stream()
                .map(tariff -> new Price(tariff.getAgeFrom(), tariff.getAgeToExclusive(), tariff.getMonthlyAmount(), tariff.getValidFrom(), tariff.getValidTo())).toList();
        var individualPrices = overrides.findByChildIdOrderByValidFromAsc(child.getId()).stream()
                .map(price -> new IndividualPrice(price.getMonthlyAmount(), price.getValidFrom(), price.getValidTo())).toList();
        var certificates = illnesses.effective(child.getId(), month.atDay(1), month.atEndOfMonth()).stream()
                .map(certificate -> new PeriodRange(certificate.getDateFrom(), certificate.getDateTo())).toList();
        var input = new Input(month, child.getBirthDate(), child.getAdmissionDate(), child.getWithdrawalDate(), days, certificates, prices, individualPrices);
        return new BillingSnapshot(input, calculator.calculate(input));
    }
}
