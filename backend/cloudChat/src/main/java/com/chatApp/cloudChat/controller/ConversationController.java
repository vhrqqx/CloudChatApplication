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
    public ResponseEntity<ConversationResponse> createConversation(@Valid @RequestBody CreateConversationRequest request) {
        ConversationResponse convo = conversationService.createConversation(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(convo.id()).toUri();
        return ResponseEntity.created(location).body(convo);
    }
    @GetMapping
    public PagedModel<ConversationResponse> getConversations(Pageable pageable) {
        return new PagedModel<>(conversationService.list(pageable));
    }
}
