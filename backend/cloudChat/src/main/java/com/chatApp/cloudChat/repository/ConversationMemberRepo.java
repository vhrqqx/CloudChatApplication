package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationMemberRepo extends JpaRepository<ConversationMember, Long> {
    public List<ConversationMember> findByUserId(Long id);
    public List<ConversationMember> findByConversationId(Long id);
    public void deleteByUserId(Long id);
}
