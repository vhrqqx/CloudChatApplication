package com.chatApp.cloudChat.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SendAttachmentRequest(@NotBlank @Size(max = 100) String filename, @NotBlank String fileType, @NotNull Long fileSize) {
}
