package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Conversations;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationRepo extends JpaRepository<Conversations, Long> {
    public Optional<Conversations> findByConversationId(Long convoId);
    public void deleteByConversationId(Long id);
}
