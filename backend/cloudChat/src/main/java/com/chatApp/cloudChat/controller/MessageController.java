package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.MessageResponse;
import com.chatApp.cloudChat.DTO.SendMessageRequest;
import com.chatApp.cloudChat.DTO.UpdateMessageRequest;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/v1/message")
public class MessageController {
    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    public PagedModel<MessageResponse> listMessage(Pageable pageable,
                                                   @RequestParam Long conversationId,
                                                   @AuthenticationPrincipal AppUserPrincipal principal) {
        return new PagedModel<>(messageService.getMessageByConversation(conversationId, principal.getId(), pageable));
    }

    @GetMapping("/{messageId}")
    public MessageResponse getMessageById(@PathVariable Long messageId,
                                          @RequestParam Long conversationId,
                                          @AuthenticationPrincipal AppUserPrincipal principal) {
        return messageService.findByMessageId(messageId, conversationId, principal.getId());
    }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMsg(@Valid @RequestBody SendMessageRequest request,
                                                   @RequestParam Long conversationId,
                                                   @AuthenticationPrincipal AppUserPrincipal principal) {
        MessageResponse createdMsg = messageService.sendMessage(conversationId, principal.getId(), request);
        return ResponseEntity.status(201).body(createdMsg);
    }

    @PatchMapping("/{messageId}")
    public ResponseEntity<MessageResponse> editMsg(@Valid @RequestBody UpdateMessageRequest request,
                                                   @PathVariable Long messageId,
                                                   @AuthenticationPrincipal AppUserPrincipal principal) {
        MessageResponse newMsg = messageService.editMessage(messageId, principal.getId(), request);
        return ResponseEntity.ok(newMsg);
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMsg(@PathVariable Long messageId,
                                          @AuthenticationPrincipal AppUserPrincipal principal) {
        messageService.deleteByMessageId(messageId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
