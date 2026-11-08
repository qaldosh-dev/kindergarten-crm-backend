package kz.kindergarten.finance;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import kz.kindergarten.auth.UserEntity;

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
    @Column(columnDefinition = "text", nullable = false)
    private String response;
    private Instant createdAt;

    public UUID getRequestKey() { return requestKey; }
    public void setRequestKey(UUID value) { requestKey = value; }
    public UserEntity getActor() { return actor; }
    public void setActor(UserEntity value) { actor = value; }
    public String getFingerprint() { return fingerprint; }
    public void setFingerprint(String value) { fingerprint = value; }
    public String getResponse() { return response; }
    public void setResponse(String value) { response = value; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant value) { createdAt = value; }
}
