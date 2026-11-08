package kz.kindergarten.pricing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class PricingDtos {
    private PricingDtos() {}

    public record CalendarDayView(LocalDate date, boolean baseWorking, boolean closed, String reason, Long version) {}
    public record CalendarView(int year, int month, List<CalendarDayView> days) {}
    public record DayInput(@NotNull LocalDate date, @NotNull Boolean baseWorking, @NotNull Boolean closed,
                           @Size(max = 10000) String reason, Long version) {}
    public record CalendarInput(@NotNull @Size(max = 31) List<@Valid DayInput> days) {}
    public record TariffInput(@Min(0) int ageFrom, @Min(1) Integer ageToExclusive,
                              @NotNull @DecimalMin("0") @Digits(integer = 15, fraction = 0) BigDecimal monthlyAmount,
                              @NotNull LocalDate validFrom, LocalDate validTo, Long version, @Size(max = 10000) String reason) {}
    public record TariffView(Long id, int ageFrom, Integer ageToExclusive, BigDecimal monthlyAmount,
                             LocalDate validFrom, LocalDate validTo, Long version) {}
    public record OverrideInput(@NotNull @DecimalMin("0") @Digits(integer = 15, fraction = 0) BigDecimal monthlyAmount,
                                @NotNull LocalDate validFrom, LocalDate validTo, @NotBlank @Size(max = 10000) String reason, Long version) {}
    public record OverrideView(Long id, BigDecimal monthlyAmount, LocalDate validFrom, LocalDate validTo, String reason, Long version) {}
}
