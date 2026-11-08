package kz.kindergarten.finance;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import kz.kindergarten.auth.UserEntity;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@org.hibernate.annotations.Immutable
@Table(name = "idempotency_request")
public class IdempotencyRequest {
    @Id
    private UUID requestKey;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id")
    private UserEntity actor;
    private String fingerprint;
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode response;
    private Instant createdAt;

    public UUID getRequestKey() { return requestKey; }
    public void setRequestKey(UUID value) { requestKey = value; }
    public UserEntity getActor() { return actor; }
    public void setActor(UserEntity value) { actor = value; }
    public String getFingerprint() { return fingerprint; }
    public void setFingerprint(String value) { fingerprint = value; }
    public JsonNode getResponse() { return response; }
    public void setResponse(JsonNode value) { response = value; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant value) { createdAt = value; }
}
