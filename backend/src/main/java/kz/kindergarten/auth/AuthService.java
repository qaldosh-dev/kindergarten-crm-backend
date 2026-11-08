package kz.kindergarten.auth;

import java.time.*;
import kz.kindergarten.auth.AuthDtos.*;
import kz.kindergarten.audit.AuditService;
import kz.kindergarten.common.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthService {
    private final UserRepository users;
    private final UserMapper mapper;
    private final CurrentUser current;
    private final PasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final AuditService audit;
    private final BusinessTime time;
    private final Duration lifetime;

    public AuthService(UserRepository users, UserMapper mapper, CurrentUser current, PasswordEncoder passwords,
                       JwtEncoder encoder, AuditService audit, BusinessTime time, @Value("${app.token-lifetime}") Duration lifetime) {
        this.users = users;
        this.mapper = mapper;
        this.current = current;
        this.passwords = passwords;
        this.encoder = encoder;
        this.audit = audit;
        this.time = time;
        this.lifetime = lifetime;
    }

    public LoginResponse login(Login request) {
        var user = users.findByLogin(request.login()).orElseThrow(this::invalidCredentials);
        if (!user.getActive() || !passwords.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        Instant now = time.now();
        Instant expiresAt = now.plus(lifetime);
        var claims = JwtClaimsSet.builder().issuer("kindergarten").subject(user.getId().toString())
                .issuedAt(now).expiresAt(expiresAt).claim("login", user.getLogin()).claim("role", user.getRole())
                .claim("tv", Long.toString(user.getTokenVersion())).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResponse(token, expiresAt, mapper.loginUser(user));
    }

    private ApiException invalidCredentials() {
        return new ApiException(401, "INVALID_CREDENTIALS", "Неверный логин или пароль");
    }

    public UserView me() {
        return mapper.view(users.findById(current.id()).orElseThrow(ApiException::missing));
    }

    public PageResponse<UserView> list(Pageable pageable) {
        return PageResponse.from(users.findAll(pageable).map(mapper::view));
    }

    @Transactional
    public UserView create(CreateUser request) {
        var user = new UserEntity();
        user.setLogin(request.login().trim());
        user.setPasswordHash(passwords.encode(request.password()));
        user.setRole("TEACHER");
        users.saveAndFlush(user);
        var result = mapper.view(user);
        audit.record("USER", user.getId(), "CREATE", null, result, "");
        return result;
    }

    @Transactional
    public UserView update(long id, UpdateUser request) {
        var user = users.lock(id).orElseThrow(ApiException::missing);
        Rules.version(user, request.version());
        if (!request.active() && id == current.id()) {
            throw ApiException.rule("Нельзя заблокировать себя");
        }
        var before = mapper.view(user);
        user.setLogin(request.login().trim());
        user.setActive(request.active());
        user.setTokenVersion(user.getTokenVersion() + 1);
        users.flush();
        var result = mapper.view(user);
        audit.record("USER", id, "UPDATE", before, result, "");
        return result;
    }

    @Transactional
    public void reset(long id, ResetPassword request) {
        var user = users.lock(id).orElseThrow(ApiException::missing);
        replacePassword(user, request.newPassword(), true);
    }

    @Transactional
    public void changeOwn(ChangePassword request) {
        var user = users.lock(current.id()).orElseThrow(ApiException::missing);
        if (!passwords.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.rule("Неверный текущий пароль");
        }
        replacePassword(user, request.newPassword(), false);
    }

    private void replacePassword(UserEntity user, String password, boolean forced) {
        user.setPasswordHash(passwords.encode(password));
        user.setMustChangePassword(forced);
        user.setTokenVersion(user.getTokenVersion() + 1);
        audit.record("USER", user.getId(), "PASSWORD_CHANGED", null, null, "");
    }
}
