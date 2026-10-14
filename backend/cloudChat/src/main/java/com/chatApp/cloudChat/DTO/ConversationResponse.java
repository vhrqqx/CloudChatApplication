package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.ConversationType;

import java.time.Instant;
import java.time.LocalDateTime;

public record ConversationResponse(Long id, ConversationType conversationType, Instant createdAt) {
    public static ConversationResponse from (Conversation c) {
        return new ConversationResponse(c.getConversationId(), c.getConvoType(), c.getCreatedAt());
    }
}