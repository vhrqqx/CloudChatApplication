package com.chatApp.cloudChat.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "users")
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;
    @Email
    private String userEmail;
    private String username;
    private String password;
    private LocalDateTime createdAt;
    @Enumerated(EnumType.STRING)
    private UserStatus status;

    public Users() {}

    public Users(Long userId, String userEmail, String username, String password, LocalDateTime createdAt, UserStatus status) {
        this.userId = userId;
        this.userEmail = userEmail;
        this.username = username;
        this.password = password;
        this.createdAt = createdAt;
        this.status = status;
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
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
        if (o == null || getClass() != o.getClass()) return false;
        Users users = (Users) o;
        return Objects.equals(userId, users.userId) && Objects.equals(userEmail, users.userEmail) && Objects.equals(username, users.username) && Objects.equals(password, users.password) && Objects.equals(createdAt, users.createdAt) && Objects.equals(status, users.status);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, userEmail, username, password, createdAt, status);
    }
}
