package com.chatApp.cloudChat.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(@NotBlank String username, @Email String userEmail, @Size(min = 8) String password) {
}
