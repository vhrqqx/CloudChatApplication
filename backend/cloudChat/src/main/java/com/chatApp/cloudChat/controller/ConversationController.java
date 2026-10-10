package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.model.Conversations;
import com.chatApp.cloudChat.service.ConversationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationController {
    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }
    // Create a conversation
    @PostMapping("/create-conversation")
    public Conversations createConversation(@RequestBody Conversations conversation) {
        return conversationService.createConversation(conversation);
    }
    @GetMapping
    public List<Conversations> getConversations() {
        return conversationService.getAllConversations();
    }
}
