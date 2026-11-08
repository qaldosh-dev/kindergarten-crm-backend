package kz.kindergarten.finance;

import jakarta.validation.Valid;
import java.time.YearMonth;
import java.util.UUID;
import kz.kindergarten.common.PageResponse;
import kz.kindergarten.finance.FinanceDtos.*;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class FinanceController {
    private final FinanceService service;

    public FinanceController(FinanceService service) { this.service = service; }

    @GetMapping("/children/{id}/account")
    public Account account(@PathVariable long id) { return service.account(id); }

    @GetMapping("/children/{id}/account/entries")
    public PageResponse<EntryView> entries(@PathVariable long id, Pageable pageable) { return service.entries(id, pageable); }

    @GetMapping("/payments")
    public PageResponse<PaymentView> payments(@RequestParam(required = false) Long childId,
                                               @RequestParam(required = false) YearMonth month, Pageable pageable) {
        return service.payments(childId, month, pageable);
    }

    @PostMapping("/payments")
    public PaymentView pay(@Valid @RequestBody CreatePayment request, @RequestHeader(name = "Idempotency-Key", required = false) UUID key) { return service.pay(request, key); }

    @PostMapping("/payments/{id}/cancel")
    public PaymentView cancel(@PathVariable long id, @Valid @RequestBody Reason request, @RequestHeader(name = "Idempotency-Key", required = false) UUID key) { return service.cancel(id, request, key); }

    @PostMapping("/children/{id}/opening-balance")
    public Account opening(@PathVariable long id, @Valid @RequestBody OpeningBalance request, @RequestHeader(name = "Idempotency-Key", required = false) UUID key) { return service.opening(id, request, key); }

    @PostMapping("/children/{id}/adjustments")
    public Account adjust(@PathVariable long id, @Valid @RequestBody Adjustment request, @RequestHeader(name = "Idempotency-Key", required = false) UUID key) { return service.adjust(id, request, key); }

    @PostMapping("/children/{id}/refunds")
    public Account refund(@PathVariable long id, @Valid @RequestBody Refund request, @RequestHeader(name = "Idempotency-Key", required = false) UUID key) { return service.refund(id, request, key); }
}
