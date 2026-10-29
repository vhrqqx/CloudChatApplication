package com.chatApp.cloudChat.model;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;










@Entity
@Table(name = "friend_requests", uniqueConstraints = @UniqueConstraint(
        name = "uk_friend_request_sender_receiver",
        columnNames = {"sender_id", "receiver_id"}))
public class FriendRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id")
    private User sender;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id")
    private User receiver;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FriendStatus status = FriendStatus.PENDING;
    @Column(name = "source_conversation_id")
    private Long sourceConversationId;
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column
    private Instant respondedAt;

    protected FriendRequest() {}

    public FriendRequest(User sender, User receiver, Long sourceConversationId) {
        this.sender = sender;
        this.receiver = receiver;
        this.sourceConversationId = sourceConversationId;
    }

    public Long getId() {
        return id;
    }

    public User getSender() {
        return sender;
    }

    public Long getSenderId() {
        return sender != null ? sender.getId() : null;
    }

    public User getReceiver() {
        return receiver;
    }

    public Long getReceiverId() {
        return receiver != null ? receiver.getId() : null;
    }

    public FriendStatus getStatus() {
        return status;
    }

    public void setStatus(FriendStatus status) {
        this.status = status;
    }

    public Long getSourceConversationId() {
        return sourceConversationId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(Instant respondedAt) {
        this.respondedAt = respondedAt;
    }
}
