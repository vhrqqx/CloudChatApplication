package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.MessageResponse;
import com.chatApp.cloudChat.DTO.SendMessageRequest;
import com.chatApp.cloudChat.DTO.UpdateMessageRequest;
import com.chatApp.cloudChat.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/v1/message")
public class MessageController {
    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    public PagedModel<MessageResponse> listMessage(Pageable pageable, @RequestParam Long conversationId, @RequestParam Long currentUserId) {
        return new PagedModel<>(messageService.getMessageByConversation(conversationId, currentUserId, pageable));
    }

    @GetMapping("/{messageId}")
    public MessageResponse getMessageById(@PathVariable Long messageId, @RequestParam Long conversationId, @RequestParam Long currentUserId) {
        return messageService.findByMessageId(messageId, conversationId, currentUserId);
    }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMsg(@Valid @RequestBody SendMessageRequest request, @RequestParam Long conversationId, @RequestParam Long currentUserId) {
        MessageResponse createdMsg = messageService.sendMessage(conversationId, currentUserId, request);
        return ResponseEntity.status(201).body(createdMsg);
    }

    @PatchMapping("/{messageId}")
    public ResponseEntity<MessageResponse> editMsg(@Valid @RequestBody UpdateMessageRequest request, @PathVariable Long messageId, @RequestParam Long currentUserId) {
        MessageResponse newMsg = messageService.editMessage(messageId, currentUserId, request);
        return ResponseEntity.ok(newMsg);
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMsg(@PathVariable Long messageId, @RequestParam Long currentUserId) {
        messageService.deleteByMessageId(messageId, currentUserId);
        return ResponseEntity.noContent().build();
    }
}
