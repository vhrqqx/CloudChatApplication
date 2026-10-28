package com.chatApp.cloudChat.websocket;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.chatApp.cloudChat.repository.UsersRepo;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.security.JwtService;

import io.jsonwebtoken.JwtException;

/**
 * Verifies a Bearer token and turns it into an {@link Authentication}.
 *
 * <p>Shared by {@link com.chatApp.cloudChat.security.JwtAuthenticationFilter} (REST requests)
 * and {@link StompAuthorizationInterceptor} (the STOMP CONNECT frame), so the token logic
 * exists exactly once. Re-reads the user row on every call, so soft deletes take effect
 * immediately.
 */
@Component
public class TokenAuthenticator {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UsersRepo usersRepo;

    public TokenAuthenticator(JwtService jwtService, UsersRepo usersRepo) {
        this.jwtService = jwtService;
        this.usersRepo = usersRepo;
    }

    /** @return an Authentication, or null when the header is missing/invalid/expired/revoked. */
    public Authentication authenticate(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            return null;
        }
        try {
            JwtService.VerifiedToken verified = jwtService.parseVerifiedToken(
                    authorizationHeader.substring(BEARER_PREFIX.length()));
            return usersRepo.findByIdAndIsDeletedFalse(verified.userId())
                    // A token from an earlier credential generation (password rotation, account
                    // deletion) is rejected here — revocation outlives the 12h TTL.
                    .filter(user -> user.getTokenVersion() == verified.tokenVersion())
                    .map(AppUserPrincipal::new)
                    .map(user -> UsernamePasswordAuthenticationToken.authenticated(
                            user, null, user.getAuthorities()))
                    .orElse(null);
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }
}
