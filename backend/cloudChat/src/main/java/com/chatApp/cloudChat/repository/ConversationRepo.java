package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepo extends JpaRepository<Conversation, Long> {
}
