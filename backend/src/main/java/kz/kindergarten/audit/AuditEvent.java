package kz.kindergarten.audit;

import jakarta.persistence.*;
import java.time.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import kz.kindergarten.common.*;
import kz.kindergarten.auth.UserEntity;

@Entity
@Table(name = "audit_event")
public class AuditEvent extends PersistentEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "actor_id")
    private UserEntity actor;

    private String actorLogin;

    private Instant occurredAt;

    private String entityType;

    private Long entityId;

    private String action;

    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode beforeValue;

    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode afterValue;

    private String reason = "";

    public UserEntity getActor() {
        return actor;
    }

    public void setActor(UserEntity value) {
        this.actor = value;
    }

    public String getActorLogin() {
        return actorLogin;
    }

    public void setActorLogin(String value) {
        this.actorLogin = value;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant value) {
        this.occurredAt = value;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String value) {
        this.entityType = value;
    }

    public Long getEntityId() {
        return entityId;
    }

    public void setEntityId(Long value) {
        this.entityId = value;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String value) {
        this.action = value;
    }

    public JsonNode getBeforeValue() {
        return beforeValue;
    }

    public void setBeforeValue(JsonNode value) {
        this.beforeValue = value;
    }

    public JsonNode getAfterValue() {
        return afterValue;
    }

    public void setAfterValue(JsonNode value) {
        this.afterValue = value;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String value) {
        this.reason = value;
    }
}
