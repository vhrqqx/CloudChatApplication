package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.User;

public record FriendSummary(Long userId, String username) {
    public static FriendSummary from(User u) {
        return new FriendSummary(u.getId(), u.getUsername());
    }
}
