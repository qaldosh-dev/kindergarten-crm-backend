package kz.kindergarten.auth;

import jakarta.validation.constraints.*;
import java.time.Instant;

public final class AuthDtos {
    private AuthDtos() {}

    public record Login(@NotBlank @Size(max = 160) String login, @NotBlank String password) {}
    public record ChangePassword(@NotBlank String currentPassword, @NotBlank @Size(min = 10, max = 72) String newPassword) {}
    public record ResetPassword(@NotBlank @Size(min = 10, max = 72) String newPassword) {}
    public record CreateUser(@NotBlank @Size(max = 160) String login, @NotBlank @Size(min = 10, max = 72) String password) {}
    public record UpdateUser(@NotBlank @Size(max = 160) String login, @NotNull Boolean active, @NotNull Long version) {}
    public record UserView(Long id, String login, String role, boolean active, boolean mustChangePassword, Long version) {}
    public record LoginUser(Long id, String login, String role, boolean mustChangePassword) {}
    public record LoginResponse(String accessToken, Instant expiresAt, LoginUser user) {}
}
