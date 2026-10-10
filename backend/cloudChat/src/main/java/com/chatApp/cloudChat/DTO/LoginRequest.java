package com.chatApp.cloudChat.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(@NotBlank(message = "Email cannot be blank!") @Email(message = "Must be a valid email") String userEmail, @NotBlank(message = "Password cannot be blank") String password) {}
