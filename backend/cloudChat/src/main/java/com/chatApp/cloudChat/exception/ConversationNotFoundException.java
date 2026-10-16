package com.chatApp.cloudChat.exception;

public class ConversationNotFoundException extends ResourceNotFoundException {
    public ConversationNotFoundException(String message) {
        super(message);
    }
}
