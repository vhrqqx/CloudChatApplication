package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepo extends JpaRepository<Conversation, Long> {
    @Query("select c from Conversation c join ConversationMember m on m.conversation = c " + "where m.user.id = :id")
    Page<Conversation> findByMember(Long userId, Pageable pageable);
}
