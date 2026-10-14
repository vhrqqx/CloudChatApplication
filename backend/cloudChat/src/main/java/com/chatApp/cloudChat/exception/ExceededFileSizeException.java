package com.chatApp.cloudChat.exception;

public class ExceededFileSizeException extends RuntimeException {
    public ExceededFileSizeException(String message) {
        super(message);
    }
}
