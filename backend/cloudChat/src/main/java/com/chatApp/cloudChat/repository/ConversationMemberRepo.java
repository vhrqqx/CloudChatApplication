package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.model.MemberRole;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationMemberRepo extends JpaRepository<ConversationMember, Long> {
    List<ConversationMember> findByConversation_Id(Long conversationId);
    boolean existsByConversation_IdAndUser_Id(Long conversationId, Long userId);
    boolean existsByUserId(Long id);
    long countByConversation_IdAndRole(Long conversationId, MemberRole role);
    void deleteByConversation_Id(Long conversationId);
    boolean existsByConversation_IdAndUser_IdAndRole(Long conversationId, Long userId, MemberRole memberRole);

    @Query("select m.conversation from ConversationMember m where m.user.id = :id")
    Page<Conversation> findConversationsOfUser(@Param("id") Long userId, Pageable pageable);

    /**
     * The membership list with {@code SELECT ... FOR UPDATE} row locks. Lifecycle decisions
     * that must be atomic against concurrent membership changes (last-member cascade, admin
     * succession) read the list through this method: concurrent transactions serialize on
     * these rows instead of each acting on the same stale snapshot. Deterministic ordering
     * (by user id) gives every transaction the same row-lock acquisition order.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from ConversationMember m where m.conversation.id = :conversationId order by m.user.id")
    List<ConversationMember> findAllByConversationIdForUpdate(@Param("conversationId") Long conversationId);
}
