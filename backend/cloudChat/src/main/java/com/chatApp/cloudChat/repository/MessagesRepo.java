package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Messages;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessagesRepo extends JpaRepository<Messages, Long> {
    public Optional<Messages> findByMessageId(Long id);
    public Messages editMessage(Long messageId, Messages updatedMessage);
    public void deleteByMessageId(Long id);
}
