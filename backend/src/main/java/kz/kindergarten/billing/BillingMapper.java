package kz.kindergarten.billing;

import java.time.*;
import kz.kindergarten.billing.BillingDtos.*;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface BillingMapper {
    @Mapping(target = "childId", source = "child.id")
    @Mapping(target = "childName", source = "child.fullName")
    @Mapping(target = "calculation", source = "calculationSnapshot.calculation")
    InvoiceView view(Invoice entity);

    default YearMonth month(LocalDate date) {
        return date == null ? null : YearMonth.from(date);
    }
}
