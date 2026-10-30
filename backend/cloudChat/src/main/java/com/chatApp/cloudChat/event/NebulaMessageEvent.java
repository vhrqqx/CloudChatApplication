package com.chatApp.cloudChat.event;
import com.chatApp.cloudChat.DTO.MessageResponse;
public record NebulaMessageEvent(Long conversationId,MessageResponse message) {}
