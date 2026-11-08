package kz.kindergarten.audit;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record AuditView(Long id, Long actorId, String actorLogin, Instant occurredAt, String entityType, Long entityId,
                        String action, JsonNode before, JsonNode after, String reason) {}
