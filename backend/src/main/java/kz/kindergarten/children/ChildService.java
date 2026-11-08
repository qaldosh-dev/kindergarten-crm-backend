package kz.kindergarten.children;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import jakarta.persistence.criteria.*;
import kz.kindergarten.attendance.AttendanceRepository;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.billing.InvoiceRepository;
import kz.kindergarten.children.ChildDtos.*;
import kz.kindergarten.common.*;
import kz.kindergarten.groups.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ChildService {
    private final ChildRepository children;
    private final ContactRepository contacts;
    private final MembershipRepository memberships;
    private final GroupService groups;
    private final AttendanceRepository attendance;
    private final ChildMapper mapper;
    private final AuditService audit;
    private final InvoiceRepository invoices;
    private final BusinessTime time;
    private final CalculationGate gate;
    private final jakarta.persistence.EntityManager entityManager;

    public ChildService(ChildRepository children, ContactRepository contacts, MembershipRepository memberships,
                        GroupService groups, AttendanceRepository attendance, ChildMapper mapper, AuditService audit,
                        InvoiceRepository invoices, BusinessTime time, CalculationGate gate,
                        jakarta.persistence.EntityManager entityManager) {
        this.children = children;
        this.contacts = contacts;
        this.memberships = memberships;
        this.groups = groups;
        this.attendance = attendance;
        this.mapper = mapper;
        this.audit = audit;
        this.invoices = invoices;
        this.time = time;
        this.gate = gate;
        this.entityManager = entityManager;
    }

    public ChildEntity require(long id) {
        return children.findById(id).orElseThrow(ApiException::missing);
    }

    public ChildEntity lock(long id) {
        gate.readSources();
        return children.lock(id).orElseThrow(ApiException::missing);
    }

    public static boolean enrolled(ChildEntity child, LocalDate date) {
        return !date.isBefore(child.getAdmissionDate()) && (child.getWithdrawalDate() == null || !date.isAfter(child.getWithdrawalDate()));
    }

    public static void requireEnrolled(ChildEntity child, LocalDate date) {
        if (!enrolled(child, date)) {
            throw ApiException.rule("Дата вне периода зачисления");
        }
    }

    public PageResponse<ChildView> list(Long groupId, Boolean active, String search, Pageable pageable) {
        LocalDate today = time.today();
        Specification<ChildEntity> filter = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (active != null) {
                Predicate enrolled = cb.and(cb.lessThanOrEqualTo(root.get("admissionDate"), today),
                        cb.or(cb.isNull(root.get("withdrawalDate")), cb.greaterThanOrEqualTo(root.get("withdrawalDate"), today)));
                predicates.add(active ? enrolled : cb.not(enrolled));
            }
            if (search != null && !search.isBlank()) {
                String escaped = search.toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
                predicates.add(cb.like(cb.lower(root.get("fullName")), "%" + escaped + "%", '\\'));
            }
            if (groupId != null) {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<Membership> membership = subquery.from(Membership.class);
                subquery.select(membership.get("child").get("id")).where(
                        cb.equal(membership.get("group").get("id"), groupId),
                        cb.lessThanOrEqualTo(membership.get("validFrom"), today),
                        cb.or(cb.isNull(membership.get("validTo")), cb.greaterThanOrEqualTo(membership.get("validTo"), today)));
                predicates.add(root.get("id").in(subquery));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        var page = children.findAll(filter, pageable);
        List<Long> ids = page.getContent().stream().map(child -> child.getId()).toList();
        if (ids.isEmpty()) {
            return PageResponse.from(page.map(child -> mapper.view(child, null, List.of())));
        }
        var pageContacts = contacts.findByChildIdIn(ids).stream().collect(Collectors.groupingBy(contact -> contact.getChild().getId()));
        var pageMemberships = memberships.findByChildIdIn(ids).stream().collect(Collectors.groupingBy(membership -> membership.getChild().getId()));
        return PageResponse.from(page.map(child -> mapper.view(child, currentMembership(pageMemberships.getOrDefault(child.getId(), List.of())),
                pageContacts.getOrDefault(child.getId(), List.of()).stream().map(mapper::contact).toList())));
    }

    public ChildView get(long id) {
        return view(require(id));
    }

    private ChildView view(ChildEntity child) {
        var history = memberships.findByChildIdOrderByValidFromAscIdAsc(child.getId());
        var contactViews = contacts.findByChildIdOrderById(child.getId()).stream().map(mapper::contact).toList();
        return mapper.view(child, currentMembership(history), contactViews);
    }

    private Membership currentMembership(List<Membership> history) {
        return history.stream().filter(membership -> !membership.getValidFrom().isAfter(time.today()))
                .max(Comparator.comparing(membership -> membership.getValidFrom())).orElse(null);
    }

    @Transactional
    public ChildView create(CreateChild request) {
        var group = groups.require(request.groupId());
        if (!group.getActive()) {
            throw ApiException.rule("Группа архивирована");
        }
        if (request.birthDate().isAfter(request.admissionDate())) {
            throw ApiException.rule("Дата рождения позже поступления");
        }
        var child = new ChildEntity();
        child.setFullName(request.fullName().trim());
        child.setBirthDate(request.birthDate());
        child.setAdmissionDate(request.admissionDate());
        child.setComment(Rules.comment(request.comment()));
        children.saveAndFlush(child);
        replaceContacts(child, request.contacts());
        var membership = new Membership();
        membership.setChild(child);
        membership.setGroup(group);
        membership.setValidFrom(child.getAdmissionDate());
        memberships.saveAndFlush(membership);
        var result = view(child);
        audit.record("CHILD", child.getId(), "CREATE", null, result, "");
        return result;
    }

    private void replaceContacts(ChildEntity child, List<ContactInput> inputs) {
        contacts.deleteByChildId(child.getId());
        contacts.flush();
        for (ContactInput input : inputs) {
            var contact = new ChildContact();
            contact.setChild(child);
            contact.setRepresentativeName(input.representativeName().trim());
            contact.setPhone(input.phone().trim());
            contact.setRelation(input.relation());
            contact.setComment(Rules.comment(input.comment()));
            contacts.save(contact);
        }
        contacts.flush();
    }

    @Transactional
    public ChildView update(long id, UpdateChild request) {
        var child = lock(id);
        Rules.version(child, request.version());
        var before = view(child);
        // Contact replacement also changes the card, even when child scalars stay equal.
        entityManager.lock(child, jakarta.persistence.LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        if (request.birthDate().isAfter(request.admissionDate())) {
            throw ApiException.rule("Дата рождения позже поступления");
        }
        Rules.period(request.admissionDate(), child.getWithdrawalDate());
        if (attendance.existsByChildIdAndDateBefore(id, request.admissionDate())) {
            throw ApiException.rule("Дата поступления исключает сохранённую посещаемость");
        }
        if (!request.admissionDate().equals(child.getAdmissionDate())) {
            var periods = memberships.findByChildIdOrderByValidFromAscIdAsc(id);
            if (!periods.isEmpty()) {
                var first = periods.getFirst();
                Rules.period(request.admissionDate(), first.getValidTo());
                first.setValidFrom(request.admissionDate());
            }
        }
        child.setFullName(request.fullName().trim());
        child.setBirthDate(request.birthDate());
        child.setAdmissionDate(request.admissionDate());
        child.setComment(Rules.comment(request.comment()));
        replaceContacts(child, request.contacts());
        children.flush();
        invoices.markStale(id);
        var result = view(child);
        audit.record("CHILD", id, "UPDATE", before, result, "");
        return result;
    }

    @Transactional
    public ChildView withdrawal(long id, Withdrawal request) {
        var child = lock(id);
        Rules.version(child, request.version());
        var before = view(child);
        Rules.period(child.getAdmissionDate(), request.withdrawalDate());
        var periods = memberships.findByChildIdOrderByValidFromAscIdAsc(id);
        LocalDate end = request.withdrawalDate();
        if (end != null) {
            if (attendance.existsByChildIdAndDateAfter(id, end)) {
                throw ApiException.rule("Дата ухода исключает сохранённую посещаемость");
            }
            if (child.getWithdrawalDate() != null && end.isAfter(child.getWithdrawalDate()) && !periods.isEmpty()) {
                var last = periods.getLast();
                if (Objects.equals(last.getValidTo(), child.getWithdrawalDate())) {
                    last.setValidTo(end);
                }
            }
            for (Membership membership : periods) {
                if (membership.getValidFrom().isAfter(end)) {
                    throw ApiException.rule("Сначала исправьте будущие членства");
                }
                if (membership.getValidTo() == null || membership.getValidTo().isAfter(end)) {
                    membership.setValidTo(end);
                }
            }
        } else if (child.getWithdrawalDate() != null && !periods.isEmpty()) {
            var last = periods.getLast();
            if (Objects.equals(last.getValidTo(), child.getWithdrawalDate())) {
                last.setValidTo(null);
            }
        }
        child.setWithdrawalDate(end);
        children.flush();
        invoices.markStale(id);
        var result = view(child);
        audit.record("CHILD", id, "WITHDRAWAL", before, result, "");
        return result;
    }

    public List<MembershipView> memberships(long id) {
        require(id);
        return memberships.findByChildIdOrderByValidFromAscIdAsc(id).stream().map(mapper::membership).toList();
    }

    @Transactional
    public MembershipView transfer(long childId, Transfer request) {
        var child = lock(childId);
        requireEnrolled(child, request.validFrom());
        var group = groups.require(request.groupId());
        if (!group.getActive()) {
            throw ApiException.rule("Группа архивирована");
        }
        var periods = memberships.findByChildIdOrderByValidFromAscIdAsc(childId);
        if (!periods.isEmpty()) {
            var last = periods.getLast();
            if (!request.validFrom().isAfter(last.getValidFrom())) {
                throw ApiException.rule("Новый перевод должен следовать за последним периодом; историю исправляйте отдельно");
            }
            if (last.getValidTo() == null || !last.getValidTo().isBefore(request.validFrom())) {
                last.setValidTo(request.validFrom().minusDays(1));
                memberships.flush();
            }
        }
        var membership = new Membership();
        membership.setChild(child);
        membership.setGroup(group);
        membership.setValidFrom(request.validFrom());
        membership.setValidTo(child.getWithdrawalDate());
        memberships.saveAndFlush(membership);
        var result = mapper.membership(membership);
        audit.record("MEMBERSHIP", membership.getId(), "TRANSFER", null, result, "");
        return result;
    }

    @Transactional
    public MembershipView correctMembership(long id, CorrectMembership request) {
        var membership = memberships.findById(id).orElseThrow(ApiException::missing);
        var child = lock(membership.getChild().getId());
        entityManager.refresh(membership);
        Rules.period(request.validFrom(), request.validTo());
        requireEnrolled(child, request.validFrom());
        if (request.validTo() != null) {
            requireEnrolled(child, request.validTo());
        } else if (child.getWithdrawalDate() != null) {
            throw ApiException.rule("Период выходит за дату ухода");
        }
        var before = mapper.membership(membership);
        membership.setGroup(groups.require(request.groupId()));
        membership.setValidFrom(request.validFrom());
        membership.setValidTo(request.validTo());
        memberships.flush();
        var result = mapper.membership(membership);
        audit.record("MEMBERSHIP", id, "CORRECT", before, result, Rules.reason(request.reason()));
        return result;
    }
}
