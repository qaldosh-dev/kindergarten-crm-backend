package kz.kindergarten.groups;

import java.time.LocalDate;
import java.util.List;
import kz.kindergarten.auth.*;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.common.*;
import kz.kindergarten.groups.GroupDtos.*;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GroupService {
    private final GroupRepository groups;
    private final AssignmentRepository assignments;
    private final UserRepository users;
    private final GroupMapper mapper;
    private final AuditService audit;
    private final CurrentUser current;
    private final BusinessTime time;

    public GroupService(GroupRepository groups, AssignmentRepository assignments, UserRepository users,
                        GroupMapper mapper, AuditService audit, CurrentUser current, BusinessTime time) {
        this.groups = groups;
        this.assignments = assignments;
        this.users = users;
        this.mapper = mapper;
        this.audit = audit;
        this.current = current;
        this.time = time;
    }

    public GroupEntity require(long id) {
        return groups.findById(id).orElseThrow(ApiException::missing);
    }

    public void checkAccess(long id, LocalDate date) {
        require(id);
        if (current.teacher() && !assignments.assigned(current.id(), id, date)) {
            throw new AccessDeniedException("Group not assigned on the selected date");
        }
    }

    public PageResponse<GroupView> list(Boolean active, Pageable pageable) {
        var page = active == null ? groups.findAll(pageable) : groups.findByActive(active, pageable);
        return PageResponse.from(page.map(mapper::view));
    }

    public List<GroupView> teacherGroups() {
        return assignments.groupsForTeacher(current.id(), time.today()).stream().map(mapper::view).toList();
    }

    @Transactional
    public GroupView create(CreateGroup request) {
        var group = new GroupEntity();
        group.setName(request.name().trim());
        groups.saveAndFlush(group);
        var result = mapper.view(group);
        audit.record("GROUP", group.getId(), "CREATE", null, result, "");
        return result;
    }

    @Transactional
    public GroupView update(long id, UpdateGroup request) {
        var group = require(id);
        Rules.version(group, request.version());
        var before = mapper.view(group);
        group.setName(request.name().trim());
        group.setActive(request.active());
        groups.flush();
        var result = mapper.view(group);
        audit.record("GROUP", id, "UPDATE", before, result, "");
        return result;
    }

    public List<AssignmentView> assignments(long id) {
        require(id);
        return assignments.findByGroupIdOrderByValidFromAscIdAsc(id).stream().map(mapper::assignment).toList();
    }

    @Transactional
    public AssignmentView assign(long groupId, CreateAssignment request) {
        Rules.period(request.validFrom(), request.validTo());
        var teacher = users.findById(request.teacherId()).orElseThrow(ApiException::missing);
        if (!teacher.getRole().equals("TEACHER")) {
            throw ApiException.rule("Назначить можно только воспитателя");
        }
        var assignment = new TeacherAssignment();
        assignment.setGroup(require(groupId));
        assignment.setTeacher(teacher);
        assignment.setValidFrom(request.validFrom());
        assignment.setValidTo(request.validTo());
        assignments.saveAndFlush(assignment);
        var result = mapper.assignment(assignment);
        audit.record("TEACHER_ASSIGNMENT", assignment.getId(), "CREATE", null, result, "");
        return result;
    }

    @Transactional
    public AssignmentView updateAssignment(long id, UpdateAssignment request) {
        Rules.period(request.validFrom(), request.validTo());
        var assignment = assignments.lock(id).orElseThrow(ApiException::missing);
        var before = mapper.assignment(assignment);
        assignment.setValidFrom(request.validFrom());
        assignment.setValidTo(request.validTo());
        assignments.flush();
        var result = mapper.assignment(assignment);
        audit.record("TEACHER_ASSIGNMENT", id, "UPDATE", before, result, "");
        return result;
    }
}
