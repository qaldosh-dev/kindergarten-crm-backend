package kz.kindergarten.billing;

import jakarta.validation.Valid;
import java.time.YearMonth;
import java.util.UUID;
import kz.kindergarten.billing.BillingDtos.*;
import kz.kindergarten.common.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class BillingController {
    private final BillingService service;
    private final BillingBatchService batch;

    public BillingController(BillingService service, BillingBatchService batch) {
        this.service = service;
        this.batch = batch;
    }

    @PostMapping("/billing/months/{month}/calculate")
    public MonthCalculation calculate(@PathVariable YearMonth month) { return batch.calculate(month); }

    @GetMapping("/invoices")
    public PageResponse<InvoiceView> list(@RequestParam(required = false) YearMonth month, @RequestParam(required = false) Long childId,
                                          @RequestParam(required = false) String status, Pageable pageable) { return service.list(month, childId, status, pageable); }

    @GetMapping("/invoices/{id}")
    public InvoiceView get(@PathVariable long id) { return service.get(id); }

    @PostMapping("/invoices/{id}/issue")
    public InvoiceView issue(@PathVariable long id, @Valid @RequestBody Issue request, @RequestHeader(name = "Idempotency-Key", required = false) UUID key) { return service.issue(id, request, key); }

    @PostMapping("/invoices/{id}/reconciliation-preview")
    public Preview preview(@PathVariable long id) { return service.preview(id); }

    @PostMapping("/invoices/{id}/reconcile")
    public Reconciliation reconcile(@PathVariable long id, @Valid @RequestBody Reconcile request, @RequestHeader(name = "Idempotency-Key", required = false) UUID key) { return service.reconcile(id, request, key); }
}
