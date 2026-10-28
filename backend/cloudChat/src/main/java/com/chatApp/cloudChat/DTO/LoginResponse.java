package com.chatApp.cloudChat.DTO;

import java.time.Instant;

public record LoginResponse(String accessToken, String tokenType, Instant expiresAt, UserResponse user) {
}
