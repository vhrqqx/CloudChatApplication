package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.*;
import com.chatApp.cloudChat.repository.*;
import com.chatApp.cloudChat.event.ContactEvent;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.ApplicationEventPublisher;
import java.time.Instant;
import java.util.*;

@Service
public class DirectConversationService {
    private final EntityManager entityManager;
    private final ConversationRepo conversations;
    private final ConversationMemberRepo members;
    private final MessagesRepo messages;
    private final ApplicationEventPublisher events;

    public DirectConversationService(EntityManager entityManager, ConversationRepo conversations,
            ConversationMemberRepo members, MessagesRepo messages, ApplicationEventPublisher events) {
        this.entityManager = entityManager;
        this.conversations = conversations;
        this.members = members;
        this.messages = messages;
        this.events = events;
    }

    @Transactional
    public Conversation getOrCreate(Long a, Long b) {
        if (a.equals(b)) throw new IllegalArgumentException("Cần hai người khác nhau.");
        User first = entityManager.find(User.class, Math.min(a, b), LockModeType.PESSIMISTIC_WRITE);
        User second = entityManager.find(User.class, Math.max(a, b));
        if (first == null || second == null) throw new IllegalArgumentException("Người dùng không tồn tại.");
        List<Conversation> existing = conversations.findDirectBetween(a, b);
        if (!existing.isEmpty()) {
            return existing.stream().max(Comparator.comparing(c -> messages
                    .findByConversation_IdOrderByCreatedAtDesc(c.getConversationId(), PageRequest.of(0, 1))
                    .stream().findFirst().map(Message::getCreatedAt).orElse(Instant.MIN))).orElseThrow();
        }
        Conversation conversation = conversations.save(new Conversation(ConversationType.DIRECT));
        members.saveAll(List.of(new ConversationMember(conversation, first, MemberRole.MEMBER),
                new ConversationMember(conversation, second, MemberRole.MEMBER)));
        members.flush();
        for (Long targetId : List.of(a, b)) events.publishEvent(new ContactEvent(Map.of(
                "kind", "conversation", "targetId", targetId, "conversationId", conversation.getConversationId())));
        return conversation;
    }
}
