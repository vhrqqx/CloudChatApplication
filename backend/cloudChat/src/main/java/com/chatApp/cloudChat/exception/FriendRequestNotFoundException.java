package com.chatApp.cloudChat.exception;


public class FriendRequestNotFoundException extends ResourceNotFoundException {
    public FriendRequestNotFoundException(String message) {
        super(message);
    }
}
