package com.chatApp.cloudChat.exception;

public class MemberNotFoundException extends ResourceNotFoundException {
    public MemberNotFoundException(String message) {
        super(message);
    }
}
