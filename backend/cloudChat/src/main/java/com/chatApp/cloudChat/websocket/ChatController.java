package com.chatApp.cloudChat.websocket;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import com.chatApp.cloudChat.DTO.SendMessageRequest;
import com.chatApp.cloudChat.DTO.TypingSignal;
import com.chatApp.cloudChat.DTO.MessageResponse;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.UsersRepo;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.ConversationMemberService;
import com.chatApp.cloudChat.service.MessageService;

import jakarta.validation.Valid;

/**
 * STOMP controllers dispatch by destination, not by URL — hence {@code @Controller}, not
 * {@code @RestController}.
 *
 * <p>Writes go through the same {@link MessageService} the REST controller uses: one
 * persistence path, one authorization path.
 */
@Controller
public class ChatController {

    private final MessageService messageService;
    private final ConversationMemberService memberService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UsersRepo usersRepo;

    public ChatController(MessageService messageService,
                          ConversationMemberService memberService,
                          SimpMessagingTemplate messagingTemplate,
                          UsersRepo usersRepo) {
        this.messageService = messageService;
        this.memberService = memberService;
        this.messagingTemplate = messagingTemplate;
        this.usersRepo = usersRepo;
    }

    /**
     * {@code @SendTo} expands the {@code {conversationId}} template from the
     * {@code @DestinationVariable} values, so the message lands exactly on
     * {@code /topic/conversation/<id>} with no manual template plumbing.
     *
     * <p>Fires after the service transaction commits: an early subscriber that immediately
     * re-fetches history over REST will see the row.
     */
    @MessageMapping("/chat/{conversationId}")
    @SendTo("/topic/conversation/{conversationId}")
    public MessageResponse send(@DestinationVariable Long conversationId,
                                @Valid @Payload SendMessageRequest request,
                                Principal principal) {
        return messageService.sendMessage(conversationId, StompUsers.userOf(principal).getId(), request);
    }

    /**
     * No service stands behind typing, so its checks live here: the user row is re-read like
     * {@code /app/chat} does (a soft-deleted account's pinned session identity must not keep
     * broadcasting), then membership. Without either check, a stale or foreign session could
     * broadcast typing signals into a conversation.
     */
    @MessageMapping("/typing/{conversationId}")
    public void typing(@DestinationVariable Long conversationId, Principal principal) {
        AppUserPrincipal sessionUser = StompUsers.userOf(principal);
        User user = usersRepo.findByIdAndIsDeletedFalse(sessionUser.getId())
                .orElseThrow(() -> new AccessDeniedException("Tài khoản này đã bị xóa."));
        if (!memberService.isMember(conversationId, sessionUser.getId())) {
            throw new AccessDeniedException("You are not a member of conversation " + conversationId);
        }
        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId,
                new TypingSignal(user.getId(), user.getUsername()));
    }
}
