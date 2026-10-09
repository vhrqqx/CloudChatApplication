package com.chatApp.cloudChat.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ErrorResponse(LocalDateTime timestamp, int status, String error, String message) {
}
