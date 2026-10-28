package com.chatApp.cloudChat.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.chatApp.cloudChat.model.Conversation;

@Repository
public interface ConversationRepo extends JpaRepository<Conversation, Long> {
    @Query("select c from Conversation c join ConversationMember m on m.conversation = c where m.user.id = :userId")
    Page<Conversation> findByMember(@Param("userId") Long userId, Pageable pageable);
}
