package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttachmentRepo extends JpaRepository<Attachment, Long> {
    Optional<Attachment> findByMessageId(Long id);
    void deleteByMessageId(Long id);
    boolean existsByMessageId(Long id);
}
