package com.chatApp.cloudChat.DTO;

import java.time.Instant;

import com.chatApp.cloudChat.model.Message;

public record MessageResponse(Long id, Long conversationId, Long senderId, String content, Instant createdAt) {
    public static MessageResponse from(Message msg) {
        return new MessageResponse(msg.getMessageId(), msg.getConversationId(), msg.getSenderId(), msg.getContent(), msg.getCreatedAt());
    }
}
