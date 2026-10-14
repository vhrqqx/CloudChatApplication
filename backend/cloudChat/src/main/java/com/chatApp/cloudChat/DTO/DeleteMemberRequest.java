package com.chatApp.cloudChat.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DeleteMemberRequest(@NotNull Long id) {
}
