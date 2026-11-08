package kz.kindergarten.children;

import jakarta.validation.Valid;
import java.util.List;
import kz.kindergarten.children.ChildDtos.*;
import kz.kindergarten.common.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ChildController {
    private final ChildService service;

    public ChildController(ChildService service) { this.service = service; }

    @GetMapping("/children")
    public PageResponse<ChildView> list(@RequestParam(required = false) Long groupId, @RequestParam(required = false) Boolean active,
                                        @RequestParam(required = false) String search, Pageable pageable) {
        return service.list(groupId, active, search, pageable);
    }

    @PostMapping("/children")
    public ChildView create(@Valid @RequestBody CreateChild request) { return service.create(request); }

    @GetMapping("/children/{id}")
    public ChildView get(@PathVariable long id) { return service.get(id); }

    @PatchMapping("/children/{id}")
    public ChildView update(@PathVariable long id, @Valid @RequestBody UpdateChild request) { return service.update(id, request); }

    @PutMapping("/children/{id}/withdrawal")
    public ChildView withdrawal(@PathVariable long id, @Valid @RequestBody Withdrawal request) { return service.withdrawal(id, request); }

    @GetMapping("/children/{id}/group-memberships")
    public List<MembershipView> memberships(@PathVariable long id) { return service.memberships(id); }

    @PostMapping("/children/{id}/group-memberships")
    public MembershipView transfer(@PathVariable long id, @Valid @RequestBody Transfer request) { return service.transfer(id, request); }

    @PatchMapping("/group-memberships/{id}")
    public MembershipView correct(@PathVariable long id, @Valid @RequestBody CorrectMembership request) { return service.correctMembership(id, request); }
}
