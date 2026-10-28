package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.Attachment;

public record AttachmentResponse(Long id, String filename, String contentType, Long size, String downloadUrl) {
    public static AttachmentResponse from(Attachment a) {
        String downloadUrl = a.getId() == null ? null : "/api/v1/attachment/" + a.getId() + "/download";
        return new AttachmentResponse(a.getId(), a.getFilename(), a.getContentType(), a.getSize(), downloadUrl);
    }
}
