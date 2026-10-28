package com.chatApp.cloudChat.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(@NotBlank @Size(max = 50) String username, @NotBlank @Email String userEmail, @NotBlank @Size(min = 8, max = 72) String password) {
}
