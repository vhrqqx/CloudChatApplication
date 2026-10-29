package com.chatApp.cloudChat.DTO;

import java.util.List;


public record ContactsResponse(
        List<FriendSummary> friends,
        List<FriendRequestInfo> incoming,
        List<FriendRequestInfo> outgoing) {
}
