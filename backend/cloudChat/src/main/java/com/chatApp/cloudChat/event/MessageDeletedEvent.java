package com.chatApp.cloudChat.event;






public record MessageDeletedEvent(Long conversationId, Long messageId, Long deleterId) {
}
