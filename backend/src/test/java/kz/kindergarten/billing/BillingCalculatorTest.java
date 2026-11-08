package kz.kindergarten.billing;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import kz.kindergarten.billing.BillingCalculator.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.*;

class BillingCalculatorTest {
    private final BillingCalculator calculator = new BillingCalculator();
    private final YearMonth month = YearMonth.of(2026, 10);
    private final List<Price> baseline = List.of(
            new Price(0, 2, new BigDecimal("60000"), LocalDate.of(2020, 1, 1), null),
            new Price(2, 4, new BigDecimal("50000"), LocalDate.of(2020, 1, 1), null),
            new Price(4, null, new BigDecimal("40000"), LocalDate.of(2020, 1, 1), null));

    private Input input(LocalDate born, LocalDate admission, LocalDate withdrawal, List<DayRule> calendar,
                        List<PeriodRange> illnesses, List<Price> prices, List<IndividualPrice> overrides) {
        return new Input(month, born, admission, withdrawal, calendar, illnesses, prices, overrides);
    }

    private Input standard(List<DayRule> calendar, List<PeriodRange> illnesses) {
        return input(LocalDate.of(2023, 1, 1), month.atDay(1), null, calendar, illnesses, baseline, List.of());
    }

    @ParameterizedTest
    @CsvSource({"2024-11-01,60000", "2024-10-31,50000", "2022-11-01,50000", "2022-10-31,40000", "2021-01-01,40000"})
    void birthdayCategoryAppliesToEntireMonth(LocalDate birthDate, BigDecimal expected) {
        var result = calculator.calculate(input(birthDate, month.atDay(1), null, List.of(), List.of(), baseline, List.of()));
        assertThat(result.workingDays()).isEqualTo(22);
        assertThat(result.payableDays()).isEqualTo(22);
        assertThat(result.amount()).isEqualByComparingTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
            "2024-02-29,2026-01,60000",
            "2024-02-29,2026-02,50000",
            "2024-02-29,2026-03,50000",
            "2024-02-29,2028-01,50000",
            "2024-02-29,2028-02,40000",
            "2024-02-29,2028-03,40000",
            "2024-02-28,2026-01,60000",
            "2024-02-28,2026-02,50000",
            "2024-03-31,2026-02,60000",
            "2024-03-31,2026-03,50000",
            "2024-03-31,2026-04,50000"
    })
    void leapAndNormalBirthdaysChangeCategoryInBirthdayMonth(LocalDate birthDate, YearMonth selectedMonth, BigDecimal expected) {
        var input = new Input(selectedMonth, birthDate, selectedMonth.atDay(1), null,
                List.of(), List.of(), baseline, List.of());
        var result = calculator.calculate(input);
        assertThat(result.amount()).isEqualByComparingTo(expected);
    }

    @Test
    void specificationExampleRounds4090909UpOnce() {
        var result = calculator.calculate(standard(List.of(new DayRule(month.atDay(8), true, true)),
                List.of(new PeriodRange(month.atDay(5), month.atDay(7)))));
        assertThat(result.workingDays()).isEqualTo(22);
        assertThat(result.payableDays()).isEqualTo(18);
        assertThat(result.amount()).isEqualByComparingTo("40910");
    }

    @Test
    void illnessAndClosureOnSameDateAreDeduplicated() {
        var result = calculator.calculate(standard(List.of(new DayRule(month.atDay(5), true, true)),
                List.of(new PeriodRange(month.atDay(5), month.atDay(5)))));
        assertThat(result.payableDays()).isEqualTo(21);
        assertThat(result.excludedDays()).singleElement().satisfies(day -> assertThat(day.reasons()).containsExactly("CLOSED", "ILLNESS"));
        assertThat(result.amount()).isEqualByComparingTo("47728");
    }

    @Test
    void overlappingCertificatesAreAUnionAndWeekendsAreNotDeducted() {
        var result = calculator.calculate(standard(List.of(), List.of(
                new PeriodRange(month.atDay(2), month.atDay(6)), new PeriodRange(month.atDay(5), month.atDay(7)))));
        assertThat(result.payableDays()).isEqualTo(18); // Oct 2, 5, 6, 7 only.
    }

    @Test
    void holidayIsRemovedFromDenominatorAndIllness() {
        var result = calculator.calculate(standard(List.of(new DayRule(month.atDay(5), false, false)),
                List.of(new PeriodRange(month.atDay(5), month.atDay(5)))));
        assertThat(result.workingDays()).isEqualTo(21);
        assertThat(result.payableDays()).isEqualTo(21);
        assertThat(result.amount()).isEqualByComparingTo("50000");
    }

    @Test
    void admissionAndWithdrawalAreInclusive() {
        var result = calculator.calculate(input(LocalDate.of(2023, 1, 1), month.atDay(5), month.atDay(9), List.of(), List.of(), baseline, List.of()));
        assertThat(result.payableDays()).isEqualTo(5);
        assertThat(result.amount()).isEqualByComparingTo("11364");
    }

    @Test
    void noIntermediateDailyRounding() {
        var result = calculator.calculate(input(LocalDate.of(2023, 1, 1), month.atDay(1), null, List.of(), List.of(),
                List.of(new Price(0, null, BigDecimal.ONE, month.atDay(1), null)), List.of()));
        assertThat(result.amount()).isEqualByComparingTo("1");
    }

    @Test
    void zeroWorkingDaysNeedsNoPriceAndNoDivision() {
        var days = month.atDay(1).datesUntil(month.plusMonths(1).atDay(1)).map(date -> new DayRule(date, false, false)).toList();
        var result = calculator.calculate(input(LocalDate.of(2023, 1, 1), month.atDay(1), null, days, List.of(), List.of(), List.of()));
        assertThat(result.workingDays()).isZero();
        assertThat(result.amount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void overridePrecedesAgePriceAndChangesInsideMonthWithoutDailyDivision() {
        var override = new IndividualPrice(new BigDecimal("30000"), month.atDay(1), month.atDay(15));
        var result = calculator.calculate(input(LocalDate.of(2023, 1, 1), month.atDay(1), null, List.of(), List.of(), baseline, List.of(override)));
        assertThat(result.tariffPeriods()).hasSize(2);
        assertThat(result.tariffPeriods().getFirst().payableDays()).isEqualTo(11);
        assertThat(result.amount()).isEqualByComparingTo("40000");
    }

    @Test
    void tariffVersionCanChangeInsideMonth() {
        var prices = List.of(new Price(0, null, new BigDecimal("50000"), month.atDay(1), month.atDay(15)),
                new Price(0, null, new BigDecimal("60000"), month.atDay(16), null));
        var result = calculator.calculate(input(LocalDate.of(2023, 1, 1), month.atDay(1), null, List.of(), List.of(), prices, List.of()));
        assertThat(result.amount()).isEqualByComparingTo("55000");
    }

    @Test
    void missingTariffFailsInsteadOfInventingAZeroCharge() {
        assertThatThrownBy(() -> calculator.calculate(input(LocalDate.of(2023, 1, 1), month.atDay(1), null,
                List.of(), List.of(), List.of(), List.of()))).isInstanceOf(kz.kindergarten.common.ApiException.class);
    }
}
