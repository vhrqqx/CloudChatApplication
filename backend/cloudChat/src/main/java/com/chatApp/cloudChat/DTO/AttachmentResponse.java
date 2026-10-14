package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.Attachment;

public record AttachmentResponse(Long id, String filename, String contentType, Long size, String objectKey) {
    public static AttachmentResponse from(Attachment a) {
        return new AttachmentResponse(a.getId(), a.getFilename(), a.getContentType(), a.getSize(), a.getObjectKey());
    }
}
