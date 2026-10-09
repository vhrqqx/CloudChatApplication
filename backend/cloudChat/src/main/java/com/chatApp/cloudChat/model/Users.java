package com.chatApp.cloudChat.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.validation.constraints.Email;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
public class Users {
    @Id
    private Long userId;
    @Email
    private String userEmail;
    private String username;
    private String passwordHashed;
    private LocalDateTime createdAt;

    public Users() {}

    public Users(Long userId, String userEmail, String username, String passwordHashed, LocalDateTime createdAt) {
        this.userId = userId;
        this.userEmail = userEmail;
        this.username = username;
        this.passwordHashed = passwordHashed;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return userId;
    }

    public void setId(Long userId) {
        this.userId = userId;
    }

    public String getUser_email() {
        return userEmail;
    }

    public void setUser_email(String user_email) {
        this.userEmail = user_email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHashed() {
        return passwordHashed;
    }

    public void setPasswordHashed(String passwordHashed) {
        this.passwordHashed = passwordHashed;
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
        Users users = (Users) o;
        return Objects.equals(userId, users.userId) && Objects.equals(userEmail, users.userEmail) && Objects.equals(username, users.username) && Objects.equals(passwordHashed, users.passwordHashed) && Objects.equals(createdAt, users.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, userEmail, username, passwordHashed, createdAt);
    }
}
