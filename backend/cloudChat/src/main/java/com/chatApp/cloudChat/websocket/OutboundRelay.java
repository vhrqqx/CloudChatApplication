package com.chatApp.cloudChat.websocket;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.chatApp.cloudChat.event.ContactEvent;
import com.chatApp.cloudChat.event.MessageDeletedEvent;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.UsersRepo;







@Component
public class OutboundRelay {

    private final SimpMessagingTemplate messagingTemplate;
    private final UsersRepo usersRepo;

    public OutboundRelay(SimpMessagingTemplate messagingTemplate, UsersRepo usersRepo) {
        this.messagingTemplate = messagingTemplate;
        this.usersRepo = usersRepo;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onContactEvent(ContactEvent event) {
        messagingTemplate.convertAndSend("/topic/contacts", (java.lang.Object) event.payload());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageDeleted(MessageDeletedEvent event) {
        String deleterName = usersRepo.findById(event.deleterId())
                .map(User::getUsername)
                .orElse("Có người");
        Object payload = java.util.Map.of(
                "kind", "messageDeleted",
                "conversationId", event.conversationId(),
                "messageId", event.messageId(),
                "deleterId", event.deleterId(),
                "deleterName", deleterName);
        messagingTemplate.convertAndSend("/topic/conversation/" + event.conversationId(), payload);
    }
}
