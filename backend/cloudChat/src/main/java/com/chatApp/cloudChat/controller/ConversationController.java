package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.ConversationResponse;
import com.chatApp.cloudChat.DTO.CreateConversationRequest;
import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.service.ConversationService;
import jakarta.servlet.Servlet;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationController {
    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }
    // Create a conversation
    @PostMapping()
    public ResponseEntity<ConversationResponse> createConversation(@Valid @RequestBody CreateConversationRequest request, @RequestParam Long creatorId) {
        ConversationResponse convo = conversationService.createConversation(request, creatorId);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(convo.id()).toUri();
        return ResponseEntity.created(location).body(convo);
    }
    @GetMapping
    public PagedModel<ConversationResponse> listConversations(Pageable pageable, @RequestParam Long currentUserId) {
        return new PagedModel<>(conversationService.list(pageable, currentUserId));
    }
    @DeleteMapping("/{conversation_id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long conversation_id, @RequestParam Long currentUserId) {
        conversationService.deleteByConversationId(conversation_id, currentUserId);
        return ResponseEntity.noContent().build();
    }

}
