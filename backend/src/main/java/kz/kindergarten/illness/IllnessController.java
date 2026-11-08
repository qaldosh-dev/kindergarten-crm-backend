package kz.kindergarten.illness;

import jakarta.validation.Valid;
import kz.kindergarten.common.PageResponse;
import kz.kindergarten.illness.IllnessDtos.*;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class IllnessController {
    private final IllnessService service;

    public IllnessController(IllnessService service) { this.service = service; }

    @GetMapping("/children/{id}/illness-certificates")
    public PageResponse<CertificateView> list(@PathVariable long id, Pageable pageable) { return service.list(id, pageable); }

    @PostMapping("/children/{id}/illness-certificates")
    public CertificateView confirm(@PathVariable long id, @Valid @RequestBody ConfirmIllness request) { return service.confirm(id, request); }

    @PostMapping("/illness-certificates/{id}/revoke")
    public CertificateView revoke(@PathVariable long id, @Valid @RequestBody Revoke request) { return service.revoke(id, request); }
}
