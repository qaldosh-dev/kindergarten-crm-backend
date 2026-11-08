package kz.kindergarten.billing;

import java.math.*;
import java.time.*;
import java.util.*;
import kz.kindergarten.common.ApiException;
import org.springframework.stereotype.Component;

/** Pure monetary calculation. No repositories, clock, or attendance marks are consulted. */
@Component
public class BillingCalculator {
    public record DayRule(LocalDate date, boolean baseWorking, boolean closed) {}
    public record PeriodRange(LocalDate from, LocalDate to) {
        public boolean covers(LocalDate date) {
            return !date.isBefore(from) && (to == null || !date.isAfter(to));
        }
    }
    public record Price(int ageFrom, Integer ageToExclusive, BigDecimal monthlyAmount, LocalDate from, LocalDate to) {
        public boolean applies(int age, LocalDate date) {
            return age >= ageFrom && (ageToExclusive == null || age < ageToExclusive)
                    && !date.isBefore(from) && (to == null || !date.isAfter(to));
        }
    }
    public record IndividualPrice(BigDecimal monthlyAmount, LocalDate from, LocalDate to) {
        public boolean covers(LocalDate date) {
            return !date.isBefore(from) && (to == null || !date.isAfter(to));
        }
    }
    public record Input(YearMonth month, LocalDate birthDate, LocalDate admissionDate, LocalDate withdrawalDate,
                        List<DayRule> calendar, List<PeriodRange> illnesses, List<Price> tariffs,
                        List<IndividualPrice> overrides) {}
    public record ExcludedDay(LocalDate date, List<String> reasons) {}
    public record TariffPeriod(LocalDate from, LocalDate to, BigDecimal monthlyAmount, int payableDays) {}
    public record Calculation(int workingDays, int payableDays, BigDecimal amount, List<ExcludedDay> excludedDays,
                              List<TariffPeriod> tariffPeriods, String explanation) {}

    public Calculation calculate(Input input) {
        Map<LocalDate, DayRule> calendar = new HashMap<>();
        input.calendar().forEach(day -> calendar.put(day.date(), day));
        // The whole birthday month uses the new category, including February 29
        // birthdays in a February that has only 28 days.
        int age = input.month().getYear() - input.birthDate().getYear();
        if (input.month().getMonthValue() < input.birthDate().getMonthValue()) {
            age--;
        }
        int workingDays = 0;
        int payableDays = 0;
        BigDecimal numerator = BigDecimal.ZERO;
        List<ExcludedDay> excluded = new ArrayList<>();
        List<TariffPeriod> periods = new ArrayList<>();

        for (LocalDate date = input.month().atDay(1); !date.isAfter(input.month().atEndOfMonth()); date = date.plusDays(1)) {
            DayRule day = calendar.getOrDefault(date, new DayRule(date, date.getDayOfWeek().getValue() <= 5, false));
            if (!day.baseWorking()) {
                continue;
            }
            workingDays++;
            List<String> reasons = new ArrayList<>();
            if (date.isBefore(input.admissionDate()) || (input.withdrawalDate() != null && date.isAfter(input.withdrawalDate()))) {
                reasons.add("OUTSIDE_ENROLLMENT");
            }
            if (day.closed()) {
                reasons.add("CLOSED");
            }
            LocalDate currentDate = date;
            if (input.illnesses().stream().anyMatch(period -> period.covers(currentDate))) {
                reasons.add("ILLNESS");
            }
            if (!reasons.isEmpty()) {
                excluded.add(new ExcludedDay(date, List.copyOf(reasons)));
                continue;
            }

            BigDecimal monthlyPrice = price(input, age, date);
            numerator = numerator.add(monthlyPrice);
            payableDays++;
            if (!periods.isEmpty() && periods.getLast().monthlyAmount().compareTo(monthlyPrice) == 0) {
                TariffPeriod previous = periods.removeLast();
                periods.add(new TariffPeriod(previous.from(), date, monthlyPrice, previous.payableDays() + 1));
            } else {
                periods.add(new TariffPeriod(date, date, monthlyPrice, 1));
            }
        }
        BigDecimal amount = workingDays == 0 ? BigDecimal.ZERO
                : numerator.divide(BigDecimal.valueOf(workingDays), 0, RoundingMode.CEILING);
        String explanation = "Сумма месячных цен оплачиваемых дней: " + numerator.toPlainString()
                + "; базовые рабочие дни: " + workingDays + "; округление вверх один раз: " + amount.toPlainString() + " ₸";
        return new Calculation(workingDays, payableDays, amount, List.copyOf(excluded), List.copyOf(periods), explanation);
    }

    private BigDecimal price(Input input, int age, LocalDate date) {
        var overrides = input.overrides().stream().filter(price -> price.covers(date)).toList();
        if (overrides.size() > 1) {
            throw ApiException.rule("Пересекающиеся индивидуальные цены");
        }
        if (!overrides.isEmpty()) {
            return overrides.getFirst().monthlyAmount();
        }
        var prices = input.tariffs().stream().filter(price -> price.applies(age, date)).toList();
        if (prices.size() != 1) {
            throw ApiException.rule("Нет единственного тарифа на " + date + " для возраста " + age);
        }
        return prices.getFirst().monthlyAmount();
    }
}
