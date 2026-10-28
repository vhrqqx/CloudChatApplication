package com.chatApp.cloudChat.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.chatApp.cloudChat.model.User;

/**
 * The authenticated user.
 *
 * <p>{@link #getUsername()} returns the email on purpose: it is the login identifier, and
 * {@code Authentication.getName()} returns whatever this method returns. The human-facing
 * display name is {@link #getDisplayName()}.
 */
public class AppUserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String displayName;
    private final String passwordHash;
    private final boolean enabled;
    private final long tokenVersion;

    public AppUserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getUserEmail();
        this.displayName = user.getUsername();
        this.passwordHash = user.getPassword();
        this.enabled = !user.isDeleted();
        this.tokenVersion = user.getTokenVersion();
    }

    public Long getId() {
        return id;
    }

    public long getTokenVersion() {
        return tokenVersion;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
