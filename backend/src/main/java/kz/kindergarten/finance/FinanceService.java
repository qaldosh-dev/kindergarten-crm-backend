package kz.kindergarten.finance;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import jakarta.persistence.criteria.Predicate;
import kz.kindergarten.auth.*;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.billing.*;
import kz.kindergarten.children.*;
import kz.kindergarten.common.*;
import kz.kindergarten.finance.FinanceDtos.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FinanceService {
    private final LedgerRepository ledger;
    private final PaymentRepository payments;
    private final AllocationRepository allocations;
    private final ChildService children;
    private final InvoiceRepository invoices;
    private final UserRepository users;
    private final CurrentUser current;
    private final BusinessTime time;
    private final FinanceMapper mapper;
    private final PaymentAllocator allocator;
    private final IdempotencyService idempotency;
    private final AuditService audit;

    public FinanceService(LedgerRepository ledger, PaymentRepository payments, AllocationRepository allocations,
                          ChildService children, InvoiceRepository invoices, UserRepository users, CurrentUser current,
                          BusinessTime time, FinanceMapper mapper, PaymentAllocator allocator, IdempotencyService idempotency, AuditService audit) {
        this.ledger = ledger;
        this.payments = payments;
        this.allocations = allocations;
        this.children = children;
        this.invoices = invoices;
        this.users = users;
        this.current = current;
        this.time = time;
        this.mapper = mapper;
        this.allocator = allocator;
        this.idempotency = idempotency;
        this.audit = audit;
    }

    @Transactional
    public Account account(long childId) {
        children.lock(childId);
        BigDecimal balance = ledger.balance(childId);
        var entries = ledger.findByChildId(childId, PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "id")))
                .map(mapper::entry).getContent();
        var recentPayments = payments.findByChildId(childId, PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "id")))
                .map(mapper::payment).getContent();
        return new Account(childId, balance, balance.max(BigDecimal.ZERO), balance.negate().max(BigDecimal.ZERO), entries, recentPayments);
    }

    public PageResponse<EntryView> entries(long childId, Pageable pageable) {
        children.require(childId);
        return PageResponse.from(ledger.findByChildId(childId, pageable).map(mapper::entry));
    }

    public PageResponse<PaymentView> payments(Long childId, YearMonth month, Pageable pageable) {
        Specification<Payment> filter = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (childId != null) {
                predicates.add(cb.equal(root.get("child").get("id"), childId));
            }
            if (month != null) {
                predicates.add(cb.between(root.get("paidOn"), month.atDay(1), month.atEndOfMonth()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageResponse.from(payments.findAll(filter, pageable).map(mapper::payment));
    }

    @Transactional
    public PaymentView pay(CreatePayment request, UUID key) {
        return idempotency.execute(key, "payment", request, PaymentView.class, () -> {
            var child = children.lock(request.childId());
            var payment = new Payment();
            payment.setChild(child);
            payment.setAmount(request.amount());
            payment.setPaidOn(request.paidOn());
            payment.setMethod(request.method().name());
            payment.setComment(Rules.comment(request.comment()));
            payment.setCreatedBy(users.getReferenceById(current.id()));
            payments.saveAndFlush(payment);
            post(child, "PAYMENT", payment.getAmount().negate(), payment.getPaidOn(), payment.getComment(), null, payment, null);
            reallocate(child.getId());
            var result = mapper.payment(payment);
            audit.record("PAYMENT", payment.getId(), "CREATE", null, result, payment.getComment());
            return result;
        });
    }

    @Transactional
    public PaymentView cancel(long id, Reason request, UUID key) {
        return idempotency.execute(key, "cancel-payment/" + id, request, PaymentView.class, () -> {
            var payment = payments.findById(id).orElseThrow(ApiException::missing);
            children.lock(payment.getChild().getId());
            // Refresh after waiting for the child lock: another transaction may have cancelled it.
            entityRefresh(payment);
            if (payment.getCancelledAt() != null) {
                return mapper.payment(payment);
            }
            var before = mapper.payment(payment);
            payment.setCancelledAt(time.now());
            payment.setCancellationReason(Rules.reason(request.reason()));
            payments.flush();
            post(payment.getChild(), "PAYMENT_CANCEL", payment.getAmount(), time.today(), request.reason(), null, payment, null);
            reallocate(payment.getChild().getId());
            var result = mapper.payment(payment);
            audit.record("PAYMENT", id, "CANCEL", before, result, request.reason());
            return result;
        });
    }

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private void entityRefresh(Object entity) {
        entityManager.refresh(entity);
    }

    @Transactional
    public Account opening(long childId, OpeningBalance request, UUID key) {
        return idempotency.execute(key, "opening/" + childId, request, Account.class, () -> {
            var child = children.lock(childId);
            if (ledger.existsByChildIdAndType(childId, "OPENING_BALANCE")) {
                throw new ApiException(409, "OPENING_BALANCE_EXISTS", "Начальный остаток уже введён");
            }
            post(child, "OPENING_BALANCE", request.amount(), time.today(), Rules.reason(request.reason()), null, null, null);
            reallocate(childId);
            return account(childId);
        });
    }

    @Transactional
    public Account adjust(long childId, Adjustment request, UUID key) {
        return idempotency.execute(key, "adjustment/" + childId, request, Account.class, () -> {
            var child = children.lock(childId);
            Invoice invoice = null;
            if (request.invoiceId() != null) {
                invoice = invoices.findById(request.invoiceId()).orElseThrow(ApiException::missing);
                if (!invoice.getChild().getId().equals(childId) || !invoice.getStatus().equals("ISSUED")) {
                    throw ApiException.rule("Счёт должен быть выставлен этому ребёнку");
                }
            }
            post(child, "ADJUSTMENT", request.amount(), time.today(), Rules.reason(request.reason()), invoice, null, null);
            reallocate(childId);
            return account(childId);
        });
    }

    @Transactional
    public Account refund(long childId, Refund request, UUID key) {
        return idempotency.execute(key, "refund/" + childId, request, Account.class, () -> {
            var child = children.lock(childId);
            BigDecimal available = ledger.balance(childId).negate();
            if (request.amount().compareTo(available) > 0) {
                throw ApiException.rule("Возврат превышает доступную переплату");
            }
            post(child, "REFUND", request.amount(), request.paidOn(), Rules.reason(request.reason()), null, null, null);
            reallocate(childId);
            return account(childId);
        });
    }

    /** Caller holds the child lock; issue and posting share the same transaction. */
    @Transactional
    public LedgerEntry post(ChildEntity child, String type, BigDecimal amount, LocalDate paidOn, String reason,
                            Invoice invoice, Payment payment, BillingSnapshot snapshot) {
        var entry = new LedgerEntry();
        entry.setChild(child);
        entry.setType(type);
        entry.setAmount(amount);
        entry.setPaidOn(paidOn);
        entry.setReason(Rules.comment(reason));
        entry.setInvoice(invoice);
        entry.setPayment(payment);
        entry.setCalculationSnapshot(snapshot);
        entry.setCreatedBy(users.getReferenceById(current.id()));
        entry.setCreatedAt(time.now());
        ledger.saveAndFlush(entry);
        audit.record("ACCOUNT_ENTRY", entry.getId(), "POST", null, mapper.entry(entry), reason);
        return entry;
    }

    /** Caller holds the child lock. Rebuilt allocations are derived data, never a second ledger. */
    @Transactional
    public void reallocate(long childId) {
        var entries = ledger.findByChildIdOrderByPaidOnAscIdAsc(childId);
        Map<Long, BigDecimal> invoiceTotals = new HashMap<>();
        Map<Long, LedgerEntry> invoiceCharges = new HashMap<>();
        List<PaymentAllocator.Charge> charges = new ArrayList<>();
        BigDecimal generalCredit = BigDecimal.ZERO;
        BigDecimal refunded = BigDecimal.ZERO;
        for (LedgerEntry entry : entries) {
            if (entry.getType().equals("PAYMENT") || entry.getType().equals("PAYMENT_CANCEL")) {
                continue;
            }
            if (entry.getType().equals("REFUND")) {
                refunded = refunded.add(entry.getAmount());
            } else if (entry.getInvoice() != null) {
                invoiceTotals.merge(entry.getInvoice().getId(), entry.getAmount(), BigDecimal::add);
                if (entry.getType().equals("CHARGE")) {
                    invoiceCharges.put(entry.getInvoice().getId(), entry);
                }
            } else if (entry.getAmount().signum() > 0) {
                charges.add(new PaymentAllocator.Charge(entry.getId(), entry.getPaidOn(), entry.getAmount()));
            } else {
                generalCredit = generalCredit.subtract(entry.getAmount());
            }
        }
        for (var invoiceTotal : invoiceTotals.entrySet()) {
            BigDecimal amount = invoiceTotal.getValue();
            if (amount.signum() > 0) {
                var charge = invoiceCharges.get(invoiceTotal.getKey());
                charges.add(new PaymentAllocator.Charge(charge.getId(), charge.getPaidOn(), amount));
            } else {
                generalCredit = generalCredit.subtract(amount);
            }
        }
        var activePayments = payments.findByChildIdAndCancelledAtIsNullOrderByPaidOnAscIdAsc(childId);
        var funds = activePayments.stream().map(payment -> new PaymentAllocator.Funds(payment.getId(), payment.getPaidOn(), payment.getAmount())).toList();
        var distribution = allocator.allocate(charges, funds, generalCredit, refunded);
        allocations.deleteForChild(childId);
        allocations.flush();
        for (var allocation : distribution) {
            var entity = new PaymentAllocation();
            entity.setPayment(payments.getReferenceById(allocation.paymentId()));
            entity.setChargeEntry(ledger.getReferenceById(allocation.chargeEntryId()));
            entity.setAmount(allocation.amount());
            allocations.save(entity);
        }
        allocations.flush();
    }
}
