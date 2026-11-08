package kz.kindergarten.illness;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import kz.kindergarten.attendance.*;
import kz.kindergarten.auth.*;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.billing.InvoiceRepository;
import kz.kindergarten.children.*;
import kz.kindergarten.common.*;
import kz.kindergarten.illness.IllnessDtos.*;
import kz.kindergarten.pricing.PricingService;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class IllnessService {
    private final IllnessRepository certificates;
    private final ChildService children;
    private final AttendanceRepository attendance;
    private final PricingService pricing;
    private final UserRepository users;
    private final CurrentUser current;
    private final BusinessTime time;
    private final AuditService audit;
    private final InvoiceRepository invoices;
    private final IllnessMapper mapper;
    private final jakarta.persistence.EntityManager entityManager;

    public IllnessService(IllnessRepository certificates, ChildService children, AttendanceRepository attendance,
                          PricingService pricing, UserRepository users, CurrentUser current, BusinessTime time,
                          AuditService audit, InvoiceRepository invoices, IllnessMapper mapper,
                          jakarta.persistence.EntityManager entityManager) {
        this.certificates = certificates;
        this.children = children;
        this.attendance = attendance;
        this.pricing = pricing;
        this.users = users;
        this.current = current;
        this.time = time;
        this.audit = audit;
        this.invoices = invoices;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    public PageResponse<CertificateView> list(long childId, Pageable pageable) {
        children.require(childId);
        return PageResponse.from(certificates.findByChildId(childId, pageable).map(mapper::view));
    }

    @Transactional
    public CertificateView confirm(long childId, ConfirmIllness request) {
        var child = children.lock(childId);
        Rules.period(request.dateFrom(), request.dateTo());
        ChildService.requireEnrolled(child, request.dateFrom());
        ChildService.requireEnrolled(child, request.dateTo());
        if (request.receivedOn().isAfter(time.today()) || request.receivedOn().isBefore(request.dateFrom())
                || request.dateTo().isAfter(time.today())) {
            throw ApiException.rule("Некорректные даты справки");
        }
        if (time.today().isAfter(request.dateTo().plusDays(7))) {
            Rules.reason(request.lateReason());
        }
        var existing = attendance.findByChildIdAndDateBetween(childId, request.dateFrom(), request.dateTo()).stream()
                .collect(Collectors.toMap(mark -> mark.getDate(), Function.identity()));
        List<LocalDate> eligibleDates = request.dateFrom().datesUntil(request.dateTo().plusDays(1))
                .filter(date -> {
                    var day = pricing.day(date);
                    return day.baseWorking() && !day.closed();
                }).toList();
        var conflicts = eligibleDates.stream().filter(date -> existing.containsKey(date) && existing.get(date).getStatus().equals("PRESENT")).toList();
        if (!conflicts.isEmpty() && !request.confirmAttendanceOverride()) {
            throw new ApiException(409, "ATTENDANCE_CONFLICT", "Есть отметки присутствия; подтвердите исправление", conflicts);
        }
        var certificate = new IllnessCertificate();
        certificate.setChild(child);
        certificate.setDateFrom(request.dateFrom());
        certificate.setDateTo(request.dateTo());
        certificate.setReceivedOn(request.receivedOn());
        certificate.setConfirmedAt(time.now());
        certificate.setConfirmedBy(users.getReferenceById(current.id()));
        certificate.setLateReason(Rules.comment(request.lateReason()));
        certificates.saveAndFlush(certificate);

        for (LocalDate date : eligibleDates) {
            var mark = existing.getOrDefault(date, new Attendance());
            String before = mark.getStatus();
            mark.setChild(child);
            mark.setDate(date);
            mark.setStatus("ABSENT");
            mark.setUpdatedBy(certificate.getConfirmedBy());
            mark.setUpdatedAt(time.now());
            attendance.saveAndFlush(mark);
            audit.record("ATTENDANCE", mark.getId(), "ILLNESS_CONFIRMED", before, mark.getStatus(), "Справка №" + certificate.getId());
        }
        invoices.markStale(childId);
        var result = mapper.view(certificate);
        audit.record("ILLNESS_CERTIFICATE", certificate.getId(), "CONFIRM", null, result, request.lateReason());
        return result;
    }

    @Transactional
    public CertificateView revoke(long id, Revoke request) {
        var certificate = certificates.findById(id).orElseThrow(ApiException::missing);
        children.lock(certificate.getChild().getId());
        entityManager.refresh(certificate);
        if (certificate.getRevokedAt() != null) {
            return mapper.view(certificate);
        }
        var before = mapper.view(certificate);
        certificate.setRevokedAt(time.now());
        certificate.setRevocationReason(Rules.reason(request.reason()));
        certificates.flush();
        invoices.markStale(certificate.getChild().getId());
        var result = mapper.view(certificate);
        audit.record("ILLNESS_CERTIFICATE", id, "REVOKE", before, result, request.reason());
        return result;
    }
}
