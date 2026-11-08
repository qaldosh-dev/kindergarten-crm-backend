package kz.kindergarten.groups;

import jakarta.validation.Valid;
import java.util.List;
import kz.kindergarten.common.PageResponse;
import kz.kindergarten.groups.GroupDtos.*;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class GroupController {
    private final GroupService service;

    public GroupController(GroupService service) { this.service = service; }

    @GetMapping("/groups")
    public PageResponse<GroupView> groups(@RequestParam(required = false) Boolean active, Pageable pageable) { return service.list(active, pageable); }

    @PostMapping("/groups")
    public GroupView create(@Valid @RequestBody CreateGroup request) { return service.create(request); }

    @PatchMapping("/groups/{id}")
    public GroupView update(@PathVariable long id, @Valid @RequestBody UpdateGroup request) { return service.update(id, request); }

    @GetMapping("/groups/{id}/teacher-assignments")
    public List<AssignmentView> assignments(@PathVariable long id) { return service.assignments(id); }

    @PostMapping("/groups/{id}/teacher-assignments")
    public AssignmentView assign(@PathVariable long id, @Valid @RequestBody CreateAssignment request) { return service.assign(id, request); }

    @PatchMapping("/teacher-assignments/{id}")
    public AssignmentView updateAssignment(@PathVariable long id, @Valid @RequestBody UpdateAssignment request) { return service.updateAssignment(id, request); }

    @GetMapping("/teacher/groups")
    public List<GroupView> teacherGroups() { return service.teacherGroups(); }
}
