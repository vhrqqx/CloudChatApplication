package com.chatApp.cloudChat.DTO;

import java.time.Instant;


public record FriendRequestInfo(
        Long requestId,
        Long otherId,
        String otherName,
        Long sourceConversationId,
        String sourceName,
        Instant createdAt) {
}
