package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.User;

public record UserResponse(Long id, String username, String email) {
    public static UserResponse from (User u) {
        return new UserResponse(u.getId(), u.getUsername(), u.getUserEmail());
    }
}
