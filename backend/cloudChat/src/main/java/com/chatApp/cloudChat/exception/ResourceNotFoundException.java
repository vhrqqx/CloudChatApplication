package com.chatApp.cloudChat.exception;

public abstract class ResourceNotFoundException extends RuntimeException {
    protected ResourceNotFoundException(String message) {
        super(message);
    }
}
