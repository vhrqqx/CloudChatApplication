package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.repository.ConversationMemberRepo;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ConversationMemberService {
    private final ConversationMemberRepo conversationMemberRepo;
    public ConversationMemberService(ConversationMemberRepo conversationMemberRepo) {
        this.conversationMemberRepo = conversationMemberRepo;
    }
    public List<ConversationMember> findByUserId(Long userId) {
        return conversationMemberRepo.findByUserId(userId);
    }
    public List<ConversationMember> findByConversationId(Long conversationId) {
        return conversationMemberRepo.findByConversationId(conversationId);
    }
    public void deleteById(Long userId) {
        conversationMemberRepo.deleteByUserId(userId);
    }
}
