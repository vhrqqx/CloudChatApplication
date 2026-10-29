package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.AddMemberRequest;
import com.chatApp.cloudChat.DTO.MemberResponse;
import com.chatApp.cloudChat.event.SessionRevocationEvent;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.exception.MemberNotFoundException;
import com.chatApp.cloudChat.exception.UserNotFoundException;
import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.model.ConversationType;
import com.chatApp.cloudChat.model.MemberRole;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.ConversationMemberRepo;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ConversationMemberService {
    private final ConversationMemberRepo conversationMemberRepo;
    private final ConversationRepo conversationRepo;
    private final UsersRepo usersRepo;
    private final ConversationPurgeService purgeService;
    private final ApplicationEventPublisher eventPublisher;
    private final FriendService friendService;

    public ConversationMemberService(ConversationMemberRepo conversationMemberRepo, ConversationRepo conversationRepo,
                                     UsersRepo usersRepo, ConversationPurgeService purgeService,
                                     ApplicationEventPublisher eventPublisher, FriendService friendService) {
        this.conversationMemberRepo = conversationMemberRepo;
        this.conversationRepo = conversationRepo;
        this.usersRepo = usersRepo;
        this.purgeService = purgeService;
        this.eventPublisher = eventPublisher;
        this.friendService = friendService;
    }

    // Thêm / Xóa / Rời nhóm
    @Transactional
    public MemberResponse addMember(Long conversationId, Long currentUserId, AddMemberRequest request) {
        Conversation conversation = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException("Không tìm thấy cuộc trò chuyện với mã " + conversationId));

        if (conversation.getConvoType() != ConversationType.GROUP) {
            throw new IllegalArgumentException("Không thể thêm thành viên vào cuộc trò chuyện trực tiếp (DIRECT)");
        }

        if (!isMember(conversationId, currentUserId)) {
            throw new AccessDeniedException("Bạn không phải là thành viên của cuộc trò chuyện này");
        }

        User targetUser = usersRepo.findById(request.userId()).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với mã " + request.userId()));

        if (targetUser.isDeleted()) throw new IllegalArgumentException("Tài khoản này đã bị xóa.");

        if (isMember(conversationId, request.userId())) {
            throw new IllegalArgumentException("Người dùng đã là thành viên của cuộc trò chuyện");
        }

        if (!friendService.areFriends(currentUserId, request.userId())) {
            throw new AccessDeniedException("Chỉ có thể thêm bạn bè vào nhóm — hãy kết bạn qua nhóm này trước.");
        }

        ConversationMember member = new ConversationMember(conversation, targetUser, MemberRole.MEMBER);
        ConversationMember saved;
        try {
            saved = conversationMemberRepo.save(member);
        } catch (DataIntegrityViolationException e) {
            // The duplicate check above races with concurrent adds; the
            // uk_conversation_member_conversation_user constraint is the real backstop.
            // (A concurrent conversation invalidation surfaces the same deep translation —
            // self-healing either way, and surfaced as the same 409 family.)
            throw new IllegalStateException("Người dùng đã là thành viên của cuộc trò chuyện");
        }
        return new MemberResponse(saved.getUserId(), targetUser.getUsername(), saved.getRole());
    }

    @Transactional
    public void removeMember(Long conversationId, Long currentUserId, Long targetUserId) {
        if (!isAdmin(conversationId, currentUserId)) {
            throw new AccessDeniedException("Chỉ quản trị viên mới có quyền xóa thành viên khỏi nhóm");
        }

        if (currentUserId.equals(targetUserId)) {
            throw new AccessDeniedException("Không thể tự xóa chính mình khỏi nhóm, vui lòng dùng chức năng rời nhóm");
        }

        // Serialize against concurrent lifecycle changes and always decide on the locked state.
        List<ConversationMember> lockedMembers = conversationMemberRepo.findAllByConversationIdForUpdate(conversationId);
        ConversationMember member = lockedMembers.stream()
                .filter(m -> m.getUserId().equals(targetUserId))
                .findFirst()
                .orElseThrow(() -> new MemberNotFoundException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        conversationMemberRepo.delete(member);

        // The admin acting here always remains a member (self-removal is refused above), so
        // the locked list always holds ≥ 2 rows — a removal can never create the zero-member
        // state that leaveConversation's cascade handles.
        eventPublisher.publishEvent(new SessionRevocationEvent(targetUserId));
    }

    @Transactional
    public void leaveConversation(Long conversationId, Long userId) {
        // Serialize concurrent leaves (and role/removal changes) with row locks, then make
        // every lifecycle decision from the locked, committed state — never from a snapshot
        // taken before the mutation. Concurrent leaves of the two admins or of the last two
        // members otherwise each act on pre-state, ending in a zero-ADMIN group or an
        // unmanaged, unrejoinable conversation.
        List<ConversationMember> lockedMembers = conversationMemberRepo.findAllByConversationIdForUpdate(conversationId);

        ConversationMember leavingMember = lockedMembers.stream()
                .filter(m -> m.getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new MemberNotFoundException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        if (leavingMember.getConversation().getConvoType() == ConversationType.DIRECT) {
            throw new AccessDeniedException("Bạn không thể rời chat trong cuộc trò chuyện direct");
        }

        conversationMemberRepo.delete(leavingMember);

        if (lockedMembers.size() <= 1) {
            // Last member leaving deletes the conversation (lifecycle contract). Purge the
            // messages first — the mandatory messages FK has no database cascade — and let
            // the purge remove the stored attachment objects after commit.
            purgeService.purgeConversationData(conversationId);
            conversationRepo.deleteById(conversationId);
        } else if (leavingMember.getRole() == MemberRole.ADMIN) {
            boolean hasOtherAdmin = lockedMembers.stream()
                    .anyMatch(m -> !m.getUserId().equals(userId) && m.getRole() == MemberRole.ADMIN);

            if (!hasOtherAdmin) {
                lockedMembers.stream()
                        .filter(m -> !m.getUserId().equals(userId))
                        .findFirst()
                        .ifPresent(nextAdmin -> nextAdmin.setRole(MemberRole.ADMIN));
            }
        }

        // The leaver revoked their own access; their live session must stop receiving the topic.
        eventPublisher.publishEvent(new SessionRevocationEvent(userId));
    }

    // Quản lý Vai trò & Phân quyền
    @Transactional
    public MemberResponse changeRole(Long conversationId, Long currentUserId, Long targetUserId, MemberRole newRole) {
        if (!isAdmin(conversationId, currentUserId)) {
            throw new AccessDeniedException("Chỉ quản trị viên mới có quyền thay đổi vai trò của thành viên");
        }

        // Locked list: the last-admin guard must count against serialized committed state,
        // otherwise concurrent demotions (two admins demoting each other) can leave the
        // group without any admin. Refuses removing the group's last admin role regardless
        // of who is demoting whom.
        List<ConversationMember> lockedMembers = conversationMemberRepo.findAllByConversationIdForUpdate(conversationId);
        ConversationMember targetMember = lockedMembers.stream()
                .filter(m -> m.getUserId().equals(targetUserId))
                .findFirst()
                .orElseThrow(() -> new MemberNotFoundException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        if (targetMember.getRole() == MemberRole.ADMIN && newRole != MemberRole.ADMIN) {
            boolean otherAdminRemains = lockedMembers.stream()
                    .anyMatch(m -> !m.getUserId().equals(targetUserId) && m.getRole() == MemberRole.ADMIN);
            if (!otherAdminRemains) {
                throw new AccessDeniedException("Không thể hạ quyền của quản trị viên duy nhất trong nhóm");
            }
        }

        targetMember.setRole(newRole);
        ConversationMember saved = conversationMemberRepo.save(targetMember);
        return new MemberResponse(saved.getUserId(), saved.getUser().getUsername(), saved.getRole());
    }

    // Tìm kiếm thành viên và cuộc trò chuyện
    @Transactional(readOnly = true)
    public List<MemberResponse> getMembersByConversation(Long conversationId, Long currentUserId) {
        if (!isMember(conversationId, currentUserId)) {
            throw new AccessDeniedException("Bạn không phải là thành viên của cuộc trò chuyện này");
        }

        List<ConversationMember> members = conversationMemberRepo.findByConversation_Id(conversationId);
        List<Long> userIds = members.stream().map(ConversationMember::getUserId).toList();
        Map<Long, String> usernames = usersRepo.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, User::getUsername));

        return members.stream().map(m -> new MemberResponse(m.getUserId(), usernames.getOrDefault(m.getUserId(), "Unknown"), m.getRole())).toList();
    }

    // Kiểm tra quyền thành viên
    @Transactional(readOnly = true)
    public boolean isMember(Long conversationId, Long currentUserId) {
        return conversationMemberRepo.existsByConversation_IdAndUser_Id(conversationId, currentUserId);
    }

    @Transactional(readOnly = true)
    public boolean isAdmin(Long conversationId, Long userId) {
        return conversationMemberRepo.existsByConversation_IdAndUser_IdAndRole(conversationId, userId, MemberRole.ADMIN);
    }
}