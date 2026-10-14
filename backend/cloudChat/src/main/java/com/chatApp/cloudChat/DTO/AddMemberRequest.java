package com.chatApp.cloudChat.DTO;

import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(@NotNull Long userId) {
}
