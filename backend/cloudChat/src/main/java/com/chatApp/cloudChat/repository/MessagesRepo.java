package com.chatApp.cloudChat.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.chatApp.cloudChat.model.Message;


@Repository
public interface MessagesRepo extends JpaRepository<Message, Long> {
    Page<Message> findByConversation_IdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);
}
