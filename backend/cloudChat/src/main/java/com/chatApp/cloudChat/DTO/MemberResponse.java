package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.MemberRole;

public record MemberResponse(Long id, String username, MemberRole role) {
}
