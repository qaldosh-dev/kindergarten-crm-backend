package kz.kindergarten.pricing;

import org.mapstruct.Mapper;
import kz.kindergarten.pricing.PricingDtos.*;

@Mapper(componentModel = "spring")
public interface PricingMapper {
    CalendarDayView day(CalendarDay entity);
    TariffView tariff(Tariff entity);
    OverrideView override(PriceOverride entity);
}
