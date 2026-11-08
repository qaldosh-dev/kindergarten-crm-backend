package kz.kindergarten.finance;

import kz.kindergarten.finance.FinanceDtos.*;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface FinanceMapper {
    @Mapping(target = "childId", source = "child.id")
    @Mapping(target = "childName", source = "child.fullName")
    PaymentView payment(Payment entity);

    @Mapping(target = "invoiceId", source = "invoice.id")
    @Mapping(target = "paymentId", source = "payment.id")
    EntryView entry(LedgerEntry entity);
}
