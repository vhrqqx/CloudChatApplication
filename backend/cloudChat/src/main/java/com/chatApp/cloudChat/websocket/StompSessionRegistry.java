package com.chatApp.cloudChat.websocket;

import java.io.IOException;
import java.security.Principal;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;
import org.springframework.web.socket.messaging.SessionConnectedEvent;

import com.chatApp.cloudChat.event.SessionRevocationEvent;
import com.chatApp.cloudChat.security.AppUserPrincipal;

/**
 * Tracks which live {@link WebSocketSession}s belong to which user id, and closes them on
 * demand. Membership is checked when a subscription is created; without this registry a
 * revoked member's session would keep receiving the conversation topic until the socket
 * happened to die — and heartbeats actively keep it alive. Authorization lifecycle therefore
 * publishes {@link SessionRevocationEvent} and this registry force-closes the sessions, which
 * tears down their subscriptions with them.
 *
 * <p>Sessions are captured at the raw handshake ({@link #decorate(WebSocketHandler)}, via
 * WebSocketConfig's decorator factory) because identity only arrives with the STOMP CONNECT
 * frame later; the {@link SessionConnectedEvent} associates the session id with a user. The
 * STOMP session id equals the underlying WebSocket session id, so the association directly
 * addresses the session object to close.
 */
@Component
public class StompSessionRegistry implements WebSocketHandlerDecoratorFactory {

    private static final Logger log = LoggerFactory.getLogger(StompSessionRegistry.class);

    // WebSocket session id -> session (captured at handshake, before identity exists)
    private final ConcurrentMap<String, WebSocketSession> sessionsById = new ConcurrentHashMap<>();
    // user id -> that user's live session ids
    private final ConcurrentMap<Long, Set<String>> sessionIdsByUserId = new ConcurrentHashMap<>();
    // session id -> user id (for disconnect cleanup)
    private final ConcurrentMap<String, Long> userIdBySessionId = new ConcurrentHashMap<>();

    @EventListener
    public void onStompConnected(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (!(principal instanceof Authentication authentication)
                || !(authentication.getPrincipal() instanceof AppUserPrincipal user)) {
            return;
        }
        String sessionId = SimpMessageHeaderAccessor.getSessionId(event.getMessage().getHeaders());
        if (sessionId == null) {
            return;
        }
        userIdBySessionId.put(sessionId, user.getId());
        sessionIdsByUserId.computeIfAbsent(user.getId(), k -> ConcurrentHashMap.newKeySet())
                .add(sessionId);
    }

    /**
     * Force-closes every live session of the given user. Used when authorization is revoked
     * (membership removal, self-leave, account deletion): subscriptions die with the socket,
     * so revocation takes effect immediately instead of when the client reconnects.
     */
    public void closeAllSessions(Long userId) {
        Set<String> sessionIds = sessionIdsByUserId.remove(userId);
        if (sessionIds == null) {
            return;
        }
        for (String sessionId : sessionIds) {
            userIdBySessionId.remove(sessionId);
            WebSocketSession session = sessionsById.remove(sessionId);
            if (session != null && session.isOpen()) {
                try {
                    session.close(CloseStatus.GOING_AWAY);
                } catch (IOException e) {
                    // Closing is best-effort; cleanup for the remaining maps happens on the
                    // close callback either way.
                    log.debug("Failed to close revoked session {}: {}", sessionId, e.toString());
                }
            }
        }
    }

    private void forget(String sessionId) {
        if (sessionId == null) {
            return;
        }
        sessionsById.remove(sessionId);
        Long userId = userIdBySessionId.remove(sessionId);
        if (userId != null) {
            Set<String> sessionIds = sessionIdsByUserId.get(userId);
            if (sessionIds != null) {
                sessionIds.remove(sessionId);
                if (sessionIds.isEmpty()) {
                    sessionIdsByUserId.remove(userId, sessionIds);
                }
            }
        }
    }

    @EventListener
    public void onSessionRevocation(SessionRevocationEvent event) {
        closeAllSessions(event.userId());
    }

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                sessionsById.put(session.getId(), session);
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
                forget(session.getId());
                super.afterConnectionClosed(session, closeStatus);
            }
        };
    }
}
