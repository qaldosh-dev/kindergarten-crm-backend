package kz.kindergarten.audit;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import kz.kindergarten.common.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/audit-events")
public class AuditController {
    private final AuditRepository events;
    private final AuditMapper mapper;

    public AuditController(AuditRepository events, AuditMapper mapper) {
        this.events = events;
        this.mapper = mapper;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<AuditView> list(@RequestParam(required = false) String entityType, @RequestParam(required = false) Long entityId,
                                        @RequestParam(required = false) Long actorId, Pageable pageable) {
        Specification<AuditEvent> filter = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (entityType != null) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null) {
                predicates.add(cb.equal(root.get("entityId"), entityId));
            }
            if (actorId != null) {
                predicates.add(cb.equal(root.get("actor").get("id"), actorId));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageResponse.from(events.findAll(filter, pageable).map(mapper::view));
    }
}
