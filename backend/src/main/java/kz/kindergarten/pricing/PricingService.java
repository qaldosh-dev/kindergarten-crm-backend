package kz.kindergarten.pricing;

import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.billing.InvoiceRepository;
import kz.kindergarten.children.ChildService;
import kz.kindergarten.common.*;
import kz.kindergarten.pricing.PricingDtos.*;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PricingService {
    private final CalendarRepository calendar;
    private final TariffRepository tariffs;
    private final OverrideRepository overrides;
    private final ChildService children;
    private final InvoiceRepository invoices;
    private final PricingMapper mapper;
    private final AuditService audit;
    private final CalculationGate gate;
    private final jakarta.persistence.EntityManager entityManager;

    public PricingService(CalendarRepository calendar, TariffRepository tariffs, OverrideRepository overrides,
                          ChildService children, InvoiceRepository invoices, PricingMapper mapper, AuditService audit, CalculationGate gate,
                          jakarta.persistence.EntityManager entityManager) {
        this.calendar = calendar;
        this.tariffs = tariffs;
        this.overrides = overrides;
        this.children = children;
        this.invoices = invoices;
        this.mapper = mapper;
        this.audit = audit;
        this.gate = gate;
        this.entityManager = entityManager;
    }

    public static CalendarDayView defaultDay(LocalDate date) {
        return new CalendarDayView(date, date.getDayOfWeek().getValue() <= 5, false, "", 0L);
    }

    public CalendarDayView day(LocalDate date) {
        return calendar.findById(date).map(mapper::day).orElseGet(() -> defaultDay(date));
    }

    public CalendarView month(int year, int month) {
        YearMonth selected = YearMonth.of(year, month);
        var stored = calendar.findByDateBetweenOrderByDate(selected.atDay(1), selected.atEndOfMonth()).stream()
                .collect(Collectors.toMap(day -> day.getDate(), Function.identity()));
        var days = selected.atDay(1).datesUntil(selected.plusMonths(1).atDay(1))
                .map(date -> stored.containsKey(date) ? mapper.day(stored.get(date)) : defaultDay(date)).toList();
        return new CalendarView(year, month, days);
    }

    @Transactional
    public CalendarView updateMonth(int year, int month, CalendarInput request) {
        gate.changeGlobalSources();
        YearMonth selected = YearMonth.of(year, month);
        Set<LocalDate> seen = new HashSet<>();
        for (DayInput input : request.days()) {
            if (!YearMonth.from(input.date()).equals(selected) || !seen.add(input.date())) {
                throw ApiException.rule("Дата вне месяца или повторяется");
            }
            var existing = calendar.findById(input.date());
            var before = existing.map(mapper::day).orElseGet(() -> defaultDay(input.date()));
            if (!Objects.equals(before.version(), input.version())) {
                throw ApiException.conflict();
            }
            var day = existing.orElseGet(CalendarDay::new);
            day.setDate(input.date());
            day.setBaseWorking(input.baseWorking());
            day.setClosed(input.closed());
            day.setReason(Rules.comment(input.reason()));
            calendar.saveAndFlush(day);
            if (existing.isEmpty()) {
                // Default calendar dates expose version 0. The first persisted revision
                // must differ so another edit based on the default cannot overwrite it.
                calendar.advanceInitialRevision(input.date());
                entityManager.refresh(day);
            }
            audit.record("CALENDAR", input.date().toEpochDay(), "UPDATE", before, mapper.day(day), day.getReason());
        }
        invoices.markStale(null);
        return month(year, month);
    }

    public PageResponse<TariffView> tariffs(Pageable pageable) {
        return PageResponse.from(tariffs.findAll(pageable).map(mapper::tariff));
    }

    @Transactional
    public TariffView saveTariff(Long id, TariffInput request) {
        gate.changeGlobalSources();
        Rules.period(request.validFrom(), request.validTo());
        if (request.ageToExclusive() != null && request.ageToExclusive() <= request.ageFrom()) {
            throw ApiException.rule("Некорректная возрастная категория");
        }
        var tariff = id == null ? new Tariff() : tariffs.findById(id).orElseThrow(ApiException::missing);
        TariffView before = id == null ? null : mapper.tariff(tariff);
        if (id != null) {
            Rules.version(tariff, request.version());
            Rules.reason(request.reason());
        }
        tariff.setAgeFrom(request.ageFrom());
        tariff.setAgeToExclusive(request.ageToExclusive());
        tariff.setMonthlyAmount(request.monthlyAmount());
        tariff.setValidFrom(request.validFrom());
        tariff.setValidTo(request.validTo());
        tariffs.saveAndFlush(tariff);
        invoices.markStale(null);
        var result = mapper.tariff(tariff);
        audit.record("TARIFF", tariff.getId(), id == null ? "CREATE" : "UPDATE", before, result, request.reason());
        return result;
    }

    public List<OverrideView> overrides(long childId) {
        children.require(childId);
        return overrides.findByChildIdOrderByValidFromAsc(childId).stream().map(mapper::override).toList();
    }

    @Transactional
    public OverrideView createOverride(long childId, OverrideInput request) {
        var child = children.lock(childId);
        var price = new PriceOverride();
        price.setChild(child);
        return saveOverride(price, request, true);
    }

    @Transactional
    public OverrideView updateOverride(long id, OverrideInput request) {
        var price = overrides.findById(id).orElseThrow(ApiException::missing);
        children.lock(price.getChild().getId());
        Rules.version(price, request.version());
        return saveOverride(price, request, false);
    }

    private OverrideView saveOverride(PriceOverride price, OverrideInput request, boolean create) {
        Rules.period(request.validFrom(), request.validTo());
        OverrideView before = create ? null : mapper.override(price);
        price.setMonthlyAmount(request.monthlyAmount());
        price.setValidFrom(request.validFrom());
        price.setValidTo(request.validTo());
        price.setReason(Rules.reason(request.reason()));
        overrides.saveAndFlush(price);
        invoices.markStale(price.getChild().getId());
        var result = mapper.override(price);
        audit.record("PRICE_OVERRIDE", price.getId(), create ? "CREATE" : "UPDATE", before, result, price.getReason());
        return result;
    }
}
