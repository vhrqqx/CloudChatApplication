package com.chatApp.cloudChat.websocket;

import java.security.Principal;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import com.chatApp.cloudChat.security.AppUserPrincipal;

/**
 * Resolves the {@link AppUserPrincipal} out of the STOMP session identity.
 *
 * <p>{@code Authentication.getName()} equals the email (see
 * {@code AppUserPrincipal.getUsername()}), which is also the name every user-destination call
 * must use. This helper is for when you need the user id instead.
 */
public final class StompUsers {

    private StompUsers() {
    }

    public static AppUserPrincipal userOf(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AppUserPrincipal user) {
            return user;
        }
        throw new AccessDeniedException("No authenticated STOMP session");
    }
}
