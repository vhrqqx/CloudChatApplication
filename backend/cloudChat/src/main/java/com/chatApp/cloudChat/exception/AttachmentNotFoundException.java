package com.chatApp.cloudChat.exception;

public class AttachmentNotFoundException extends ResourceNotFoundException {
    public AttachmentNotFoundException(String message) {
        super(message);
    }
}
