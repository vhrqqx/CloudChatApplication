package com.chatApp.cloudChat.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMessageRequest(@NotBlank @Size(max = 2000) String content) {
}
