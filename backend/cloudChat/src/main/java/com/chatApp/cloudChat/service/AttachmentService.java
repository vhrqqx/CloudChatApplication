package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.Attachments;
import com.chatApp.cloudChat.repository.AttachmentRepo;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
public class AttachmentService {
    private final AttachmentRepo attachmentRepo;
    public AttachmentService(AttachmentRepo attachmentRepo) {
        this.attachmentRepo = attachmentRepo;
    }
    public Optional<Attachments> findByMessageId(Long id) {
        return attachmentRepo.findByMessageId(id);
    }
    public void deleteByMessageId(Long id) {
        attachmentRepo.deleteById(id);
    }
}
