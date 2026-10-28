package com.chatApp.cloudChat.DTO;

import org.springframework.core.io.Resource;

public record AttachmentDownload(String filename, String contentType, long size, Resource resource) {
}
