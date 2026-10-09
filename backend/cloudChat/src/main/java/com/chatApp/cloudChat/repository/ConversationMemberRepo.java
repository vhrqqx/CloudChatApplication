package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationMemberRepo extends JpaRepository<ConversationMember, Long> {
    public Optional<ConversationMember> findByUserId(Long id);
    // Delete user from the conversation
    public void deleteByUserId(Long id);
}
