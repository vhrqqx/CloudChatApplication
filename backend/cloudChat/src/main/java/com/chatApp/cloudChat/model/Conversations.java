package com.chatApp.cloudChat.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
public class Conversations {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long conversationId;
    private LocalDateTime createdAt;
    private String convoType;
    private String role;

    public Conversations() {}

    public Conversations(Long conversationId, LocalDateTime createdAt, String convoType, String role) {
        this.conversationId = conversationId;
        this.createdAt = createdAt;
        this.convoType = convoType;
        this.role = role;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getConvoType() {
        return convoType;
    }

    public void setConvoType(String convoType) {
        this.convoType = convoType;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        Conversations that = (Conversations) o;
        return Objects.equals(conversationId, that.conversationId) && Objects.equals(createdAt, that.createdAt) && Objects.equals(convoType, that.convoType) && Objects.equals(role, that.role);
    }

    @Override
    public int hashCode() {
        return Objects.hash(conversationId, createdAt, convoType, role);
    }
}
