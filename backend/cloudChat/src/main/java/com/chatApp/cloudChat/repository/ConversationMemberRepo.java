package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.model.MemberRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationMemberRepo extends JpaRepository<ConversationMember, Long> {
    List<ConversationMember> findByConversationId(Long conversationId);
    List<ConversationMember> findByUserId(Long userId);
    Optional<ConversationMember> findByConversationIdAndUserId(Long conversationId, Long userId);
    boolean existsByConversationIdAndUserId(Long conversationId, Long userId);
    boolean existsByUserId(Long id);
    long countByConversationIdAndRole(Long conversationId, MemberRole role);
    void deleteByConversationIdAndUserId(Long conversationId, Long userId);
    boolean existsByConversationIdAndUserIdAndRole(Long conversationId, Long userId, MemberRole memberRole);
    @Query("select m.conversation from ConversationMember m where m.user.id = :userId")
    Page<Conversation> findConversationsOfUser(@Param("user_id") Long userId, Pageable pageable);
}
