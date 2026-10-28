package com.chatApp.cloudChat.DTO;

public record PresenceSignal(Long userId, String displayName, boolean online) {
}
