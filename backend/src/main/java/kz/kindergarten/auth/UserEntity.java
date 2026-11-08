package kz.kindergarten.auth;

import jakarta.persistence.*;
import kz.kindergarten.common.*;

@Entity
@Table(name = "app_user")
public class UserEntity extends VersionedEntity {
    private String login;

    private String passwordHash;

    private String role;

    private boolean active = true;

    private boolean mustChangePassword = true;

    private long tokenVersion;

    public String getLogin() {
        return login;
    }

    public void setLogin(String value) {
        this.login = value;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String value) {
        this.passwordHash = value;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String value) {
        this.role = value;
    }

    public boolean getActive() {
        return active;
    }

    public void setActive(boolean value) {
        this.active = value;
    }

    public boolean getMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean value) {
        this.mustChangePassword = value;
    }

    public long getTokenVersion() {
        return tokenVersion;
    }

    public void setTokenVersion(long value) {
        this.tokenVersion = value;
    }
}
