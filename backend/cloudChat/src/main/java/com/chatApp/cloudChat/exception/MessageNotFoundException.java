package com.chatApp.cloudChat.exception;

public class MessageNotFoundException extends ResourceNotFoundException {
    public MessageNotFoundException(String message) {
        super(message);
    }
}
