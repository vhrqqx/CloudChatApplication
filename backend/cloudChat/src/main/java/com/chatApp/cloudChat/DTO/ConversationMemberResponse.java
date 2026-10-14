package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.model.MemberRole;

public record ConversationMemberResponse(Long conversationId, Long userId, MemberRole role) {
    public static ConversationMemberResponse from(ConversationMember m) {
        return new ConversationMemberResponse(m.getConversationId(), m.getUserId(), m.getRole());
    }
}
