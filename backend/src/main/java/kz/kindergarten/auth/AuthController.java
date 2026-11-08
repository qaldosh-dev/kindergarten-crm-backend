package kz.kindergarten.auth;

import jakarta.validation.Valid;
import kz.kindergarten.auth.AuthDtos.*;
import kz.kindergarten.common.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody Login request) { return service.login(request); }

    @GetMapping("/me")
    public UserView me() { return service.me(); }

    @PostMapping("/auth/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void change(@Valid @RequestBody ChangePassword request) { service.changeOwn(request); }

    @GetMapping("/users")
    public PageResponse<UserView> users(Pageable pageable) { return service.list(pageable); }

    @PostMapping("/users")
    public UserView create(@Valid @RequestBody CreateUser request) { return service.create(request); }

    @PatchMapping("/users/{id}")
    public UserView update(@PathVariable long id, @Valid @RequestBody UpdateUser request) { return service.update(id, request); }

    @PostMapping("/users/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@PathVariable long id, @Valid @RequestBody ResetPassword request) { service.reset(id, request); }
}
