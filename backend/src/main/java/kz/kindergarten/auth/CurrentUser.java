package kz.kindergarten.auth;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    private JwtAuthenticationToken token() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication instanceof JwtAuthenticationToken jwt ? jwt : null;
    }

    public Long idOrNull() {
        var authentication = token();
        return authentication == null ? null : Long.parseLong(authentication.getToken().getSubject());
    }

    public long id() {
        var id = idOrNull();
        if (id == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return id;
    }

    public String login() {
        var authentication = token();
        return authentication == null ? "SYSTEM" : authentication.getToken().getClaimAsString("login");
    }

    public boolean teacher() {
        var authentication = token();
        return authentication != null && "TEACHER".equals(authentication.getToken().getClaimAsString("role"));
    }
}
