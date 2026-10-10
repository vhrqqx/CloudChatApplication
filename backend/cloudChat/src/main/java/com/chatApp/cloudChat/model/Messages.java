package com.chatApp.cloudChat.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
public class Messages {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long messageId;
    private String content;
    private Long conversationId;
    private Long senderId;
    private LocalDateTime createdAt;

    public Messages() {}

    public Messages(Long messageId, String content, Long conversationId, Long senderId, LocalDateTime createdAt) {
        this.messageId = messageId;
        this.content = content;
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.createdAt = createdAt;
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        Messages messages = (Messages) o;
        return Objects.equals(messageId, messages.messageId) && Objects.equals(conversationId, messages.conversationId) && senderId == messages.senderId && Objects.equals(content, messages.content) && Objects.equals(createdAt, messages.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(messageId, content, conversationId, senderId, createdAt);
    }
}
