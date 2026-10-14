package com.chatApp.cloudChat.model;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;


@Entity
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(length=20)
    private String title;
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private ConversationType convoType;

    protected Conversation() {}

    public Conversation(ConversationType conversationType) {
        this.convoType = conversationType;
    }


    public Long getConversationId() {
        return id;
    }

    public void setConversationId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public ConversationType getConvoType() {
        return convoType;
    }

    public void setConvoType(ConversationType convoType) {
        this.convoType = convoType;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Conversation other)) return false;
        return id != null && id.equals(other.getConversationId());
    }
    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}