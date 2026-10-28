package com.chatApp.cloudChat.model;

import jakarta.persistence.*;

import java.util.Objects;

/**
 * The tenancy row: a user's membership in a conversation. The (conversation_id, user_id) pair
 * is unique at the database level — the application-level duplicate check in addMember races
 * under concurrency, so this constraint is the real guard against duplicate memberships (a
 * duplicate would wedge every single-row membership lookup for that user).
 */
@Entity
@Table(uniqueConstraints = @UniqueConstraint(
        name = "uk_conversation_member_conversation_user",
        columnNames = {"conversation_id", "user_id"}))
public class ConversationMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberRole role = MemberRole.MEMBER;

    public ConversationMember() {}

    public ConversationMember(Conversation conversation, User user, MemberRole role) {
        this.conversation = conversation;
        this.user = user;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MemberRole getRole() {
        return role;
    }

    public void setRole(MemberRole role) {
        this.role = role;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Long getUserId() {
        return user != null ? user.getId() : null;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public Long getConversationId() {
        return conversation != null ? conversation.getConversationId() : null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ConversationMember other)) return false;
        return id != null && id.equals(other.getId());
    }
    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
