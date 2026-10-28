package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.ConversationResponse;
import com.chatApp.cloudChat.DTO.CreateConversationRequest;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationController {
    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @PostMapping()
    public ResponseEntity<ConversationResponse> createConversation(@Valid @RequestBody CreateConversationRequest request,
                                                                   @AuthenticationPrincipal AppUserPrincipal principal) {
        ConversationResponse convo = conversationService.createConversation(request, principal.getId());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(convo.id()).toUri();
        return ResponseEntity.created(location).body(convo);
    }

    @GetMapping
    public PagedModel<ConversationResponse> listConversations(Pageable pageable,
                                                              @AuthenticationPrincipal AppUserPrincipal principal) {
        return new PagedModel<>(conversationService.list(pageable, principal.getId()));
    }

    @DeleteMapping("/{conversation_id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long conversation_id,
                                                   @AuthenticationPrincipal AppUserPrincipal principal) {
        conversationService.deleteByConversationId(conversation_id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
