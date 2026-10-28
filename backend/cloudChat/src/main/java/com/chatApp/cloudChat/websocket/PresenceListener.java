package com.chatApp.cloudChat.websocket;

import java.security.Principal;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.chatApp.cloudChat.DTO.PresenceSignal;
import com.chatApp.cloudChat.security.AppUserPrincipal;

/**
 * Connection state is the data: online/offline with no storage and no REST endpoint.
 *
 * <p>Session ids are tracked here, not via {@code SimpUserRegistry}: both the registry and this
 * listener handle {@code SessionDisconnectEvent}, so which one runs first is registration order —
 * not something this code controls. If the registry ran after us, a registry-lookup guard could
 * see the just-closed session and skip the offline broadcast entirely. Owning the map makes the
 * multi-tab rule ("first tab closing must not mark the user offline") independent of listener
 * ordering: offline fires exactly when the set empties.
 *
 * <p>The payload hides the email on purpose — presence goes to a topic everyone can subscribe
 * to, and {@code PresenceSignal} carries the user id and display name only.
 */
@Component
public class PresenceListener {

    private final SimpMessagingTemplate messagingTemplate;

    // email -> session ids
    private final ConcurrentMap<String, Set<String>> sessionsByUser = new ConcurrentHashMap<>();

    public PresenceListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        AppUserPrincipal user = userOf(event.getUser());
        if (user == null) {
            return;
        }
        String sessionId = SimpMessageHeaderAccessor.getSessionId(event.getMessage().getHeaders());
        sessionsByUser.computeIfAbsent(user.getEmail(), k -> ConcurrentHashMap.newKeySet())
                .add(sessionId);
        messagingTemplate.convertAndSend("/topic/presence",
                new PresenceSignal(user.getId(), user.getDisplayName(), true));
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        AppUserPrincipal user = userOf(event.getUser());
        if (user == null) {
            return;
        }
        Set<String> sessions = sessionsByUser.get(user.getEmail());
        if (sessions == null) {
            return;
        }
        sessions.remove(SimpMessageHeaderAccessor.getSessionId(event.getMessage().getHeaders()));
        if (sessions.isEmpty()) {
            sessionsByUser.remove(user.getEmail());
            messagingTemplate.convertAndSend("/topic/presence",
                    new PresenceSignal(user.getId(), user.getDisplayName(), false));
        }
    }

    private static AppUserPrincipal userOf(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AppUserPrincipal user) {
            return user;
        }
        return null;
    }
}
