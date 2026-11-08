package kz.kindergarten.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.kindergarten.auth.*;
import kz.kindergarten.common.BusinessTime;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final AuditRepository events;
    private final UserRepository users;
    private final CurrentUser current;
    private final BusinessTime time;
    private final ObjectMapper json;

    public AuditService(AuditRepository events, UserRepository users, CurrentUser current, BusinessTime time, ObjectMapper json) {
        this.events = events;
        this.users = users;
        this.current = current;
        this.time = time;
        this.json = json;
    }

    public void record(String entityType, long entityId, String action, Object before, Object after, String reason) {
        var event = new AuditEvent();
        if (current.idOrNull() != null) {
            event.setActor(users.getReferenceById(current.id()));
        }
        event.setActorLogin(current.login());
        event.setOccurredAt(time.now());
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setAction(action);
        event.setBeforeValue(json.valueToTree(before));
        event.setAfterValue(json.valueToTree(after));
        event.setReason(reason == null ? "" : reason);
        events.save(event);
    }
}
