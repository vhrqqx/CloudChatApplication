package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Attachments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttachmentRepo extends JpaRepository<Attachments, Long> {
    public Optional<Attachments> findByMessageId(Long id);
    public void deleteByMessageId(Long id);
}
