package kz.kindergarten.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Supplier;
import kz.kindergarten.auth.*;
import kz.kindergarten.common.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class IdempotencyService {
    private final IdempotencyRepository requests;
    private final CurrentUser current;
    private final UserRepository users;
    private final ObjectMapper json;
    private final EntityManager entityManager;
    private final BusinessTime time;

    public IdempotencyService(IdempotencyRepository requests, CurrentUser current, UserRepository users,
                              ObjectMapper json, EntityManager entityManager, BusinessTime time) {
        this.requests = requests;
        this.current = current;
        this.users = users;
        this.json = json;
        this.entityManager = entityManager;
        this.time = time;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public <T> T execute(UUID key, String operation, Object body, Class<T> responseType, Supplier<T> action) {
        if (key == null) {
            return action.get();
        }
        long lockId = key.getMostSignificantBits() ^ key.getLeastSignificantBits();
        entityManager.createNativeQuery("select 1 from pg_advisory_xact_lock(:key)").setParameter("key", lockId).getSingleResult();
        String fingerprint = fingerprint(operation, body);
        var previous = requests.findById(key);
        if (previous.isPresent()) {
            if (!previous.get().getFingerprint().equals(fingerprint) || !previous.get().getActor().getId().equals(current.id())) {
                throw new ApiException(409, "IDEMPOTENCY_CONFLICT", "Ключ уже использован для другого запроса");
            }
            return json.convertValue(previous.get().getResponse(), responseType);
        }
        T response = action.get();
        var request = new IdempotencyRequest();
        request.setRequestKey(key);
        request.setActor(users.getReferenceById(current.id()));
        request.setFingerprint(fingerprint);
        request.setResponse(json.valueToTree(response));
        request.setCreatedAt(time.now());
        requests.saveAndFlush(request);
        return response;
    }

    private String fingerprint(String operation, Object body) {
        try {
            String canonical = current.id() + "\n" + operation + "\n" + json.writeValueAsString(body);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot fingerprint request", exception);
        }
    }
}
