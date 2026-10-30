package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.ConversationType;

import java.time.Instant;
import java.time.LocalDateTime;

public record ConversationResponse(Long id, ConversationType conversationType, Instant createdAt, String title) {
    public ConversationResponse(Long id, ConversationType conversationType, Instant createdAt) {
        this(id, conversationType, createdAt, null);
    }
    public static ConversationResponse from (Conversation c) {
        return new ConversationResponse(c.getConversationId(), c.getConvoType(), c.getCreatedAt(), c.getTitle());
    }
}