package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.AttachmentDownload;
import com.chatApp.cloudChat.DTO.AttachmentResponse;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.AttachmentService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/v1/attachment")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentResponse> upload(@RequestParam("file") MultipartFile file,
                                                     @RequestParam Long conversationId,
                                                     @AuthenticationPrincipal AppUserPrincipal principal) {
        AttachmentResponse created = attachmentService.sendAttachment(conversationId, principal.getId(), file);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{attachmentId}")
    public AttachmentResponse getMetadata(@PathVariable Long attachmentId,
                                          @AuthenticationPrincipal AppUserPrincipal principal) {
        return attachmentService.findByAttachmentId(attachmentId, principal.getId());
    }

    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long attachmentId,
                                             @AuthenticationPrincipal AppUserPrincipal principal) {
        AttachmentDownload dl = attachmentService.download(attachmentId, principal.getId());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(dl.contentType()))
                .contentLength(dl.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(dl.filename()))
                .body(dl.resource());
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> delete(@PathVariable Long attachmentId,
                                       @RequestParam Long conversationId,
                                       @AuthenticationPrincipal AppUserPrincipal principal) {
        attachmentService.deleteById(attachmentId, conversationId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    private static String contentDisposition(String filename) {
        String safe = filename == null || filename.isBlank() ? "file" : filename.replaceAll("[\\r\\n\"\\\\]", "_");
        return ContentDisposition.attachment()
                .filename(safe, StandardCharsets.UTF_8)
                .build()
                .toString();
    }
}
