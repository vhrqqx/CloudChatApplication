package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.ConversationResponse;
import com.chatApp.cloudChat.DTO.CreateConversationRequest;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.repository.ConversationRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConversationService {
    private final ConversationRepo conversationRepo;
    public ConversationService(ConversationRepo conversationRepo) {
        this.conversationRepo = conversationRepo;
    }
    @Transactional
    public ConversationResponse createConversation(CreateConversationRequest request) {
        Conversation savedConvo = conversationRepo.save(new Conversation(request.conversationType()));
        return ConversationResponse.from(savedConvo);
    }
    @Transactional
    public ConversationResponse getConversation(Long id) {
        return conversationRepo.findById(id).map(ConversationResponse::from).orElseThrow(() -> new ConversationNotFoundException("Không tìm thấy cuộc trò chuyện với mã " + id));
    }
    @Transactional
    public void deleteByConversationId(Long id) {
        if (!conversationRepo.existsById(id)) throw new ConversationNotFoundException("Không tìm thấy cuộc trò chuyện với mã " + id);
        conversationRepo.deleteById(id);
    }
    @Transactional(readOnly = true)
    public Page<ConversationResponse> list(Pageable pageable) {
        return conversationRepo.findAll(pageable).map(ConversationResponse::from);
    }
}
