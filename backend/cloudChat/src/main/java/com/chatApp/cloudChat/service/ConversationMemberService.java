package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.repository.ConversationMemberRepo;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ConversationMemberService {
    private final ConversationMemberRepo conversationMemberRepo;
    public ConversationMemberService(ConversationMemberRepo conversationMemberRepo) {
        this.conversationMemberRepo = conversationMemberRepo;
    }
    public Optional<ConversationMember> findByUserId(Long id) {
        return conversationMemberRepo.findById(id);
    }
    public void deleteByUserId(Long id) {
        conversationMemberRepo.deleteById(id);
    }
}
