package kz.kindergarten.pricing;

import jakarta.validation.Valid;
import java.util.List;
import kz.kindergarten.common.PageResponse;
import kz.kindergarten.pricing.PricingDtos.*;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class PricingController {
    private final PricingService service;

    public PricingController(PricingService service) { this.service = service; }

    @GetMapping("/calendar/{year}/{monthNumber}")
    public CalendarView calendar(@PathVariable int year, @PathVariable int monthNumber) { return service.month(year, monthNumber); }

    @PutMapping("/calendar/{year}/{monthNumber}")
    public CalendarView updateCalendar(@PathVariable int year, @PathVariable int monthNumber, @Valid @RequestBody CalendarInput request) { return service.updateMonth(year, monthNumber, request); }

    @GetMapping("/tariffs")
    public PageResponse<TariffView> tariffs(Pageable pageable) { return service.tariffs(pageable); }

    @PostMapping("/tariffs")
    public TariffView createTariff(@Valid @RequestBody TariffInput request) { return service.saveTariff(null, request); }

    @PatchMapping("/tariffs/{id}")
    public TariffView updateTariff(@PathVariable long id, @Valid @RequestBody TariffInput request) { return service.saveTariff(id, request); }

    @GetMapping("/children/{id}/price-overrides")
    public List<OverrideView> overrides(@PathVariable long id) { return service.overrides(id); }

    @PostMapping("/children/{id}/price-overrides")
    public OverrideView createOverride(@PathVariable long id, @Valid @RequestBody OverrideInput request) { return service.createOverride(id, request); }

    @PatchMapping("/price-overrides/{id}")
    public OverrideView updateOverride(@PathVariable long id, @Valid @RequestBody OverrideInput request) { return service.updateOverride(id, request); }
}
