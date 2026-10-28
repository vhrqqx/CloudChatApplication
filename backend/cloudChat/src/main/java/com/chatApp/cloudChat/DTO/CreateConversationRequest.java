package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.ConversationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record CreateConversationRequest(@NotNull ConversationType conversationType, @NotNull @Size(max = 50) Set<Long> memberId) {}

