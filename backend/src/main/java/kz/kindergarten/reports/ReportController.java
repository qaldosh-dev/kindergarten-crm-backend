package kz.kindergarten.reports;

import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import kz.kindergarten.reports.ReportDtos.BillingReport;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {
    private final ReportService service;

    public ReportController(ReportService service) { this.service = service; }

    @GetMapping("/billing")
    public BillingReport billing(@RequestParam YearMonth month) { return service.billing(month); }

    @GetMapping(value = "/billing.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> csv(@RequestParam YearMonth month) {
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=billing-" + month + ".csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(service.csv(month).getBytes(StandardCharsets.UTF_8));
    }
}
