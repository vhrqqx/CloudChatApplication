package com.chatApp.cloudChat.DTO;

import java.time.Instant;
import java.util.Optional;

import com.chatApp.cloudChat.model.Attachment;
import com.chatApp.cloudChat.model.Message;

public record MessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        String content,
        Instant createdAt,
        Long attachmentId,
        String filename,
        String contentType,
        Long size,
        String downloadUrl) {
    public static MessageResponse from(Message msg) {
        Optional<Attachment> attachment = msg.getAttachments().stream().findFirst();
        return attachment
                .map(a -> new MessageResponse(msg.getMessageId(), msg.getConversationId(), msg.getSenderId(), msg.getContent(), msg.getCreatedAt(),
                        a.getId(), a.getFilename(), a.getContentType(), a.getSize(), "/api/v1/attachment/" + a.getId() + "/download"))
                .orElseGet(() -> new MessageResponse(msg.getMessageId(), msg.getConversationId(), msg.getSenderId(), msg.getContent(), msg.getCreatedAt(), null, null, null, null, null));
    }
}
