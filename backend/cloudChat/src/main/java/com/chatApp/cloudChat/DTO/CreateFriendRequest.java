package com.chatApp.cloudChat.DTO;

public record CreateFriendRequest(Long receiverId, Long sourceConversationId) {
}
