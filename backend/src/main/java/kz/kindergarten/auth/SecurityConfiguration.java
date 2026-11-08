package kz.kindergarten.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfiguration {
    @Bean
    PasswordEncoder passwords() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecretKeySpec jwtKey(@Value("${app.jwt-secret}") String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder encoder(SecretKeySpec key) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder decoder(SecretKeySpec key, Clock clock) {
        var decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        var timestamps = new JwtTimestampValidator();
        timestamps.setClock(clock);
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestamps, new JwtIssuerValidator("kindergarten")));
        return decoder;
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, UserRepository users, ObjectMapper json) throws Exception {
        http.csrf(configuration -> configuration.disable())
                .sessionManagement(configuration -> configuration.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health", "/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/me", "/api/v1/auth/change-password").authenticated()
                .requestMatchers("/api/v1/teacher/**", "/api/v1/groups/*/attendance").hasAnyRole("ADMIN", "TEACHER")
                .requestMatchers("/api/v1/**").hasRole("ADMIN")
                .anyRequest().denyAll());
        http.oauth2ResourceServer(resourceServer -> resourceServer
                .jwt(jwt -> jwt.jwtAuthenticationConverter(token -> authenticate(token, users)))
                .authenticationEntryPoint((request, response, exception) -> write(json, response, 401, "UNAUTHORIZED", "Требуется вход")));
        http.exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, exception) -> write(json, response, 401, "UNAUTHORIZED", "Требуется вход"))
                .accessDeniedHandler((request, response, exception) -> write(json, response, 403, "FORBIDDEN", "Доступ запрещён")));
        return http.build();
    }

    private JwtAuthenticationToken authenticate(Jwt token, UserRepository users) {
        long userId;
        try {
            userId = Long.parseLong(token.getSubject());
        } catch (NumberFormatException exception) {
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
        }
        var user = users.findById(userId);
        if (user.isEmpty() || !user.get().getActive()
                || !Long.toString(user.get().getTokenVersion()).equals(token.getClaimAsString("tv"))) {
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
        }
        String role = user.get().getMustChangePassword() ? "PASSWORD_CHANGE" : user.get().getRole();
        return new JwtAuthenticationToken(token, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private static void write(ObjectMapper json, jakarta.servlet.http.HttpServletResponse response,
                              int status, String code, String detail) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        json.writeValue(response.getOutputStream(), java.util.Map.of(
                "status", status, "title", status == 401 ? "Unauthorized" : "Forbidden", "code", code, "detail", detail));
    }
}
