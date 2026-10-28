package com.chatApp.cloudChat.websocket;

import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.ConversationMemberService;

/**
 * Handles CONNECT (identity) and SUBSCRIBE (view access) on the client inbound channel, and
 * gates SEND to controller-mapped destinations.
 *
 * <p>Application handlers ({@code MessageService.sendMessage}, typing) already enforce
 * membership for their destinations; failures are reported to {@code /user/queue/errors} via
 * {@code WsExceptionAdvice}. But the simple broker also exposes {@code /topic} and
 * {@code /queue}: a client SEND to a broker-prefixed destination would bypass every handler
 * and, if the framework forwards client frames to broker destinations, let a non-member
 * broadcast spoofed content (or forged presence signals) to any subscriber. The membership
 * rule itself lives once — in the services; the interceptor only refuses destinations no
 * handler owns.
 *
 * <p>Exceptions thrown in an interceptor become STOMP ERROR frames for that socket; they never
 * reach the REST exception advice.
 */
@Component
public class StompAuthorizationInterceptor implements ChannelInterceptor {

    private static final String CONVERSATION_TOPIC_PREFIX = "/topic/conversation/";
    private static final String APPLICATION_DESTINATION_PREFIX = "/app/";

    private final TokenAuthenticator tokenAuthenticator;
    private final ConversationMemberService memberService;

    public StompAuthorizationInterceptor(TokenAuthenticator tokenAuthenticator,
                                         ConversationMemberService memberService) {
        this.tokenAuthenticator = tokenAuthenticator;
        this.memberService = memberService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        switch (accessor.getCommand()) {
            case CONNECT -> {
                Authentication authentication = tokenAuthenticator.authenticate(
                        accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION));
                if (authentication == null) {
                    throw new MessagingException("Invalid or missing Bearer token");
                }
                accessor.setUser(authentication); // session identity from now on
            }
            case SUBSCRIBE -> checkSubscribe(accessor);
            default -> {
                // SEND to anything no @MessageMapping handler owns (broker prefixes) is
                // refused blind — the interceptor cannot judge broker destinations and must
                // not deliver client-authored frames straight into them.
                if (accessor.getCommand() == StompCommand.SEND) {
                    String destination = accessor.getDestination();
                    if (destination == null || !destination.startsWith(APPLICATION_DESTINATION_PREFIX)) {
                        throw new MessagingException(
                                "SEND is only allowed to " + APPLICATION_DESTINATION_PREFIX + " destinations");
                    }
                }
            }
        }
        return message;
    }

    private void checkSubscribe(StompHeaderAccessor accessor) {
        try {
            AppUserPrincipal user = StompUsers.userOf(accessor.getUser());
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith(CONVERSATION_TOPIC_PREFIX)) {
                Long conversationId = Long.parseLong(
                        destination.substring(CONVERSATION_TOPIC_PREFIX.length()));
                if (!memberService.isMember(conversationId, user.getId())) {
                    throw new AccessDeniedException(
                            "You are not a member of conversation " + conversationId);
                }
            }
        } catch (AccessDeniedException ex) {
            // The interceptor's client-facing contract is MessagingException; a raw
            // AccessDeniedException escapes through the noisy fallthrough path instead.
            throw new MessagingException(ex.getMessage(), ex);
        } catch (NumberFormatException ex) {
            throw new MessagingException("Unknown destination " + accessor.getDestination(), ex);
        }
    }
}
