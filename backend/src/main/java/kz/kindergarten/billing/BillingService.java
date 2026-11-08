package kz.kindergarten.billing;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.*;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.billing.BillingDtos.*;
import kz.kindergarten.children.ChildService;
import kz.kindergarten.common.*;
import kz.kindergarten.finance.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(readOnly = true)
public class BillingService {
    private final InvoiceRepository invoices;
    private final ChildService children;
    private final CalculationSourceService calculation;
    private final FinanceService finance;
    private final LedgerRepository ledger;
    private final IdempotencyService idempotency;
    private final BillingMapper mapper;
    private final AuditService audit;
    private final BusinessTime time;
    private final EntityManager entityManager;

    public BillingService(InvoiceRepository invoices, ChildService children, CalculationSourceService calculation,
                          FinanceService finance, LedgerRepository ledger, IdempotencyService idempotency,
                          BillingMapper mapper, AuditService audit, BusinessTime time, EntityManager entityManager) {
        this.invoices = invoices;
        this.children = children;
        this.calculation = calculation;
        this.finance = finance;
        this.ledger = ledger;
        this.idempotency = idempotency;
        this.mapper = mapper;
        this.audit = audit;
        this.time = time;
        this.entityManager = entityManager;
    }

    public InvoiceView get(long id) {
        return mapper.view(invoices.findById(id).orElseThrow(ApiException::missing));
    }

    public PageResponse<InvoiceView> list(YearMonth month, Long childId, String status, Pageable pageable) {
        if (status != null && !Set.of("DRAFT", "ISSUED").contains(status)) {
            throw new IllegalArgumentException("status");
        }
        Specification<Invoice> filter = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (month != null) {
                predicates.add(cb.equal(root.get("month"), month.atDay(1)));
            }
            if (childId != null) {
                predicates.add(cb.equal(root.get("child").get("id"), childId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageResponse.from(invoices.findAll(filter, pageable).map(mapper::view));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CalculationResult draft(long childId, YearMonth month) {
        var child = children.lock(childId);
        var existing = invoices.findByChildIdAndMonth(childId, month.atDay(1));
        if (existing.isPresent() && existing.get().getStatus().equals("ISSUED")) {
            return new CalculationResult(childId, child.getFullName(), existing.get().getId(), "ALREADY_ISSUED", "Счёт уже выставлен");
        }
        var snapshot = calculation.calculate(child, month);
        var invoice = existing.orElseGet(Invoice::new);
        invoice.setChild(child);
        invoice.setMonth(month.atDay(1));
        invoice.setDueDate(month.atDay(10));
        invoice.setAmount(snapshot.calculation().amount());
        invoice.setCalculationSnapshot(snapshot);
        invoices.saveAndFlush(invoice);
        audit.record("INVOICE", invoice.getId(), "CALCULATE", null, mapper.view(invoice), "");
        return new CalculationResult(childId, child.getFullName(), invoice.getId(), "CALCULATED", "Черновик рассчитан");
    }

    private Invoice lockInvoice(long id) {
        var invoice = invoices.findById(id).orElseThrow(ApiException::missing);
        children.lock(invoice.getChild().getId());
        entityManager.refresh(invoice);
        return invoice;
    }

    @Transactional
    public InvoiceView issue(long id, Issue request, UUID key) {
        return idempotency.execute(key, "issue/" + id, request, InvoiceView.class, () -> {
            var invoice = lockInvoice(id);
            if (invoice.getStatus().equals("ISSUED")) {
                return mapper.view(invoice);
            }
            Rules.version(invoice, request.version());
            var month = YearMonth.from(invoice.getMonth());
            if (time.today().isAfter(month.atDay(10)) && request.dueDate() == null) {
                throw ApiException.rule("После 10-го числа укажите срок оплаты явно");
            }
            var snapshot = calculation.calculate(invoice.getChild(), month);
            invoice.setCalculationSnapshot(snapshot);
            invoice.setAmount(snapshot.calculation().amount());
            invoice.setDueDate(request.dueDate() == null ? month.atDay(10) : request.dueDate());
            invoice.setStatus("ISSUED");
            invoice.setIssuedAt(time.now());
            invoice.setNeedsReconciliation(false);
            invoices.flush();
            finance.post(invoice.getChild(), "CHARGE", invoice.getAmount(), invoice.getMonth(), "Начисление за " + month, invoice, null, snapshot);
            finance.reallocate(invoice.getChild().getId());
            var result = mapper.view(invoice);
            audit.record("INVOICE", id, "ISSUE", null, result, "");
            return result;
        });
    }

    @Transactional
    public Preview preview(long id) {
        var invoice = lockInvoice(id);
        requireIssued(invoice);
        var snapshot = calculation.calculate(invoice.getChild(), YearMonth.from(invoice.getMonth()));
        BigDecimal previous = ledger.automaticInvoiceTotal(id);
        BigDecimal next = snapshot.calculation().amount();
        return new Preview(id, previous, next, next.subtract(previous), snapshot.calculation());
    }

    @Transactional
    public Reconciliation reconcile(long id, Reconcile request, UUID key) {
        return idempotency.execute(key, "reconcile/" + id, request, Reconciliation.class, () -> {
            var invoice = lockInvoice(id);
            requireIssued(invoice);
            var snapshot = calculation.calculate(invoice.getChild(), YearMonth.from(invoice.getMonth()));
            BigDecimal previous = ledger.automaticInvoiceTotal(id);
            BigDecimal next = snapshot.calculation().amount();
            BigDecimal difference = next.subtract(previous);
            Long entryId = null;
            if (difference.signum() != 0) {
                var entry = finance.post(invoice.getChild(), "RECONCILIATION", difference, time.today(), Rules.reason(request.reason()), invoice, null, snapshot);
                entryId = entry.getId();
                finance.reallocate(invoice.getChild().getId());
            }
            invoice.setNeedsReconciliation(false);
            invoices.flush();
            var result = new Reconciliation(id, previous, next, difference, entryId);
            audit.record("INVOICE", id, "RECONCILE", previous, result, request.reason());
            return result;
        });
    }

    private void requireIssued(Invoice invoice) {
        if (!invoice.getStatus().equals("ISSUED")) {
            throw ApiException.rule("Сверка доступна только для выставленного счёта");
        }
    }
}
