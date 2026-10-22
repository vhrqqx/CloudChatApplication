package com.chatApp.cloudChat.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.chatApp.cloudChat.model.Message;

import java.util.Optional;


@Repository
public interface MessagesRepo extends JpaRepository<Message, Long> {
    Page<Message> findByConversation_IdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);
    Optional<Message> findByIdAndConversation_Id(Long id, Long conversationId);
    void deleteByConversation_Id(Long conversationId);
}
