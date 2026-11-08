package kz.kindergarten.attendance;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import kz.kindergarten.attendance.AttendanceDtos.*;
import kz.kindergarten.auth.*;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.children.*;
import kz.kindergarten.common.*;
import kz.kindergarten.pricing.PricingService;
import kz.kindergarten.groups.GroupService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AttendanceService {
    private final AttendanceRepository attendance;
    private final MembershipRepository memberships;
    private final ChildService children;
    private final GroupService groups;
    private final PricingService pricing;
    private final CurrentUser current;
    private final UserRepository users;
    private final AuditService audit;
    private final BusinessTime time;

    public AttendanceService(AttendanceRepository attendance, MembershipRepository memberships, ChildService children,
                             GroupService groups, PricingService pricing, CurrentUser current, UserRepository users,
                             AuditService audit, BusinessTime time) {
        this.attendance = attendance;
        this.memberships = memberships;
        this.children = children;
        this.groups = groups;
        this.pricing = pricing;
        this.current = current;
        this.users = users;
        this.audit = audit;
        this.time = time;
    }

    public GroupAttendance get(long groupId, LocalDate date) {
        groups.checkAccess(groupId, date);
        var roster = memberships.roster(groupId, date);
        List<Long> ids = roster.stream().map(membership -> membership.getChild().getId()).toList();
        Map<Long, Attendance> marks = ids.isEmpty() ? Map.of() : attendance.findByChildIdInAndDate(ids, date).stream()
                .collect(Collectors.toMap(mark -> mark.getChild().getId(), Function.identity()));
        var items = roster.stream().map(membership -> item(membership.getChild(), marks.get(membership.getChild().getId()))).toList();
        var day = pricing.day(date);
        return new GroupAttendance(groupId, date, day.baseWorking(), day.closed(), items);
    }

    private AttendanceItem item(ChildEntity child, Attendance mark) {
        return new AttendanceItem(child.getId(), child.getFullName(), mark == null ? null : mark.getStatus(),
                mark == null ? null : mark.getVersion(), mark == null ? null : mark.getUpdatedAt(),
                mark == null ? null : mark.getUpdatedBy().getLogin());
    }

    @Transactional
    public GroupAttendance save(long groupId, LocalDate date, SaveAttendance request) {
        groups.checkAccess(groupId, date);
        if (current.teacher() && !date.equals(time.today())) {
            throw new org.springframework.security.access.AccessDeniedException("Teachers may edit today only");
        }
        Set<Long> ids = new TreeSet<>();
        for (Mark mark : request.items()) {
            if (!ids.add(mark.childId())) {
                throw new IllegalArgumentException("Повторяющийся childId");
            }
        }
        // Stable lock order prevents deadlocks across multi-child attendance requests.
        ids.forEach(children::lock);
        var day = pricing.day(date);
        if (!day.baseWorking() || day.closed()) {
            throw ApiException.rule("Посещаемость допустима только в рабочий открытый день");
        }
        for (Mark input : request.items()) {
            var child = children.require(input.childId());
            ChildService.requireEnrolled(child, date);
            if (!memberships.belongs(child.getId(), groupId, date)) {
                throw ApiException.rule("Ребёнок не состоит в группе на выбранную дату");
            }
            var existing = attendance.findByChildIdAndDate(child.getId(), date);
            if (existing.isEmpty() && input.version() != null) {
                throw ApiException.conflict();
            }
            var mark = existing.orElseGet(Attendance::new);
            AttendanceItem before = existing.isEmpty() ? null : item(child, mark);
            if (existing.isPresent()) {
                if (input.version() == null) {
                    throw ApiException.conflict();
                }
                Rules.version(mark, input.version());
                if (!current.teacher() && !Objects.equals(mark.getStatus(), input.status().name())) {
                    Rules.reason(request.reason());
                }
            }
            mark.setChild(child);
            mark.setDate(date);
            mark.setStatus(input.status().name());
            mark.setUpdatedBy(users.getReferenceById(current.id()));
            mark.setUpdatedAt(time.now());
            attendance.saveAndFlush(mark);
            audit.record("ATTENDANCE", mark.getId(), "SAVE", before, item(child, mark), request.reason());
        }
        return get(groupId, date);
    }
}
