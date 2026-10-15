package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.AddMemberRequest;
import com.chatApp.cloudChat.DTO.MemberResponse;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.exception.MemberNotFoundException;
import com.chatApp.cloudChat.exception.UserNotFound;
import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.model.ConversationType;
import com.chatApp.cloudChat.model.MemberRole;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.ConversationMemberRepo;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.UsersRepo;
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

    public ConversationMemberService(ConversationMemberRepo conversationMemberRepo, ConversationRepo conversationRepo, UsersRepo usersRepo) {
        this.conversationMemberRepo = conversationMemberRepo;
        this.conversationRepo = conversationRepo;
        this.usersRepo = usersRepo;
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
            throw new IllegalArgumentException("Bạn không phải là thành viên của cuộc trò chuyện này");
        }

        User targetUser = usersRepo.findById(request.userId())
                .orElseThrow(() -> new UserNotFound("Không tìm thấy người dùng với mã " + request.userId()));

        if (targetUser.isDeleted()) throw new IllegalArgumentException("Tài khoản này đã bị xóa.");

        if (isMember(conversationId, request.userId())) {
            throw new IllegalArgumentException("Người dùng đã là thành viên của cuộc trò chuyện");
        }

        ConversationMember member = new ConversationMember(conversation, targetUser, MemberRole.MEMBER);
        ConversationMember saved = conversationMemberRepo.save(member);
        return new MemberResponse(saved.getUserId(), targetUser.getUsername(), saved.getRole());
    }

    @Transactional
    public void removeMember(Long conversationId, Long currentUserId, Long targetUserId) {
        if (!isAdmin(conversationId, currentUserId)) {
            throw new IllegalArgumentException("Chỉ quản trị viên mới có quyền xóa thành viên khỏi nhóm");
        }

        if (currentUserId.equals(targetUserId)) {
            throw new IllegalArgumentException("Không thể tự xóa chính mình khỏi nhóm, vui lòng dùng chức năng rời nhóm");
        }

        ConversationMember member = conversationMemberRepo.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new MemberNotFoundException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        conversationMemberRepo.delete(member);
    }

    @Transactional
    public void leaveConversation(Long conversationId, Long userId) {
        ConversationMember leavingMember = conversationMemberRepo.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new MemberNotFoundException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        if(leavingMember.getConversation().getConvoType() == ConversationType.DIRECT) throw new IllegalArgumentException("Bạn không thể rời chat trong cuộc trò chuyện direct");

        List<ConversationMember> allMembers = conversationMemberRepo.findByConversationId(conversationId);

        conversationMemberRepo.delete(leavingMember);

        if (allMembers.size() <= 1) {
            conversationRepo.deleteById(conversationId);
        } else if (leavingMember.getRole() == MemberRole.ADMIN) {
            boolean hasOtherAdmin = allMembers.stream()
                    .anyMatch(m -> !m.getUserId().equals(userId) && m.getRole() == MemberRole.ADMIN);

            if (!hasOtherAdmin) {
                ConversationMember nextAdmin = allMembers.stream().filter(m -> !m.getUserId().equals(userId)).findFirst().orElse(null);
                if (nextAdmin != null) {
                    nextAdmin.setRole(MemberRole.ADMIN);
                    conversationMemberRepo.save(nextAdmin);
                }
            }
        }
    }

    // Quản lý Vai trò & Phân quyền
    @Transactional
    public MemberResponse changeRole(Long conversationId, Long currentUserId, Long targetUserId, MemberRole newRole) {
        if (!isAdmin(conversationId, currentUserId)) {
            throw new IllegalArgumentException("Chỉ quản trị viên mới có quyền thay đổi vai trò của thành viên");
        }

        ConversationMember targetMember = conversationMemberRepo.findByConversationIdAndUserId(conversationId, targetUserId).orElseThrow(() -> new MemberNotFoundException("Không tìm thấy thành viên trong cuộc trò chuyện"));

        if (currentUserId.equals(targetUserId) && newRole != MemberRole.ADMIN) {
            long adminCount = conversationMemberRepo.countByConversationIdAndRole(conversationId, MemberRole.ADMIN);
            if (adminCount <= 1) {
                throw new IllegalStateException("Không thể hạ quyền của quản trị viên duy nhất trong nhóm");
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
            throw new IllegalArgumentException("Bạn không phải là thành viên của cuộc trò chuyện này");
        }

        List<ConversationMember> members = conversationMemberRepo.findByConversationId(conversationId);
        List<Long> userIds = members.stream().map(ConversationMember::getUserId).toList();
        Map<Long, String> usernames = usersRepo.findAllById(userIds).stream().collect(Collectors.toMap(User::getUserId, User::getUsername));

        return members.stream().map(m -> new MemberResponse(m.getUserId(), usernames.getOrDefault(m.getUserId(), "Unknown"), m.getRole())).toList();
    }

    @Transactional(readOnly = true)
    public List<Long> getConversationIdsByUserId(Long userId) {
        return conversationMemberRepo.findByUserId(userId).stream().map(ConversationMember::getConversationId).toList();
    }

    // Kiểm tra quyền thành viên
    @Transactional(readOnly = true)
    public boolean isMember(Long conversationId, Long currentUserId) {
        return conversationMemberRepo.existsByConversationIdAndUserId(conversationId, currentUserId);
    }

    @Transactional(readOnly = true)
    public boolean isAdmin(Long conversationId, Long userId) {
        return conversationMemberRepo.existsByConversationIdAndUserIdAndRole(conversationId, userId, MemberRole.ADMIN);
    }
}