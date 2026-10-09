package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.Conversations;
import com.chatApp.cloudChat.repository.ConversationRepo;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ConversationService {
    private final ConversationRepo conversationRepo;
    public ConversationService(ConversationRepo conversationRepo) {
        this.conversationRepo = conversationRepo;
    }
    public Optional<Conversations> findByConversationId(Long id) {
        return conversationRepo.findById(id);
    }
    public void deleteByConversationId(Long id) {
        conversationRepo.deleteById(id);
    }
}
