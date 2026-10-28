package com.chatApp.cloudChat.model;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Email
    @Column(unique = true, nullable = false)
    private String userEmail;
    @Column(nullable = false)
    private String username;
    @Column(nullable = false)
    private String password;
    @Column(nullable = false)
    private boolean isDeleted = false;
    private Instant deletedAt;
    /**
     * Credential-generation counter embedded in every issued access token ("ver" claim) and
     * re-checked against the row on every request. Bumped whenever a credential changes
     * (password rotation, account deletion) so outstanding tokens for the previous
     * generation are rejected immediately instead of lingering until their TTL expires.
     */
    @Column(nullable = false)
    private long tokenVersion = 0;
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.AVAILABLE;

    protected User() {}

    public User(String username, String userEmail, String password) {
        this.username = username;
        this.userEmail = userEmail;
        this.password = password;
    }

    public void markAsDeleted() {
        this.isDeleted = true;
        this.deletedAt = Instant.now();
        this.username = "Unknown User";
        this.userEmail = "deleted_" + this.id + "_" + UUID.randomUUID().toString().substring(0, 8) + "_" + this.userEmail;
        this.password = "";
        this.tokenVersion++; // reject every outstanding token for this account
    }

    public long getTokenVersion() {
        return tokenVersion;
    }

    public void bumpTokenVersion() {
        this.tokenVersion++;
    }

    public boolean isDeleted() {
        return isDeleted;
    }

    public void setDeleted(boolean deleted) {
        this.isDeleted = deleted;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String user_email) {
        this.userEmail = user_email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
