package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.ConversationResponse;
import com.chatApp.cloudChat.DTO.CreateConversationRequest;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.exception.UserNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import com.chatApp.cloudChat.model.*;
import com.chatApp.cloudChat.repository.ConversationMemberRepo;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ConversationService {
    private final ConversationRepo conversationRepo;
    private final UsersRepo usersRepo;
    private final ConversationMemberRepo conversationMemberRepo;
    private final ConversationMemberService memberService;
    public ConversationService(ConversationRepo conversationRepo, UsersRepo usersRepo, ConversationMemberRepo conversationMemberRepo, ConversationMemberService memberService) {
        this.conversationRepo = conversationRepo;
        this.usersRepo = usersRepo;
        this.conversationMemberRepo = conversationMemberRepo;
        this.memberService = memberService;
    }
    @Transactional
    public ConversationResponse createConversation(CreateConversationRequest request, Long creatorId) {
        User creator = usersRepo.findById(creatorId).orElseThrow(() -> new UserNotFoundException("Không tìm thấy creator " + creatorId));
        //Chuẩn hóa danh sách thành viên thêm vào nhóm
        Set<Long> otherUserIds = new HashSet<>();
        if (request.memberId() != null) {
            otherUserIds.addAll(request.memberId());
            otherUserIds.remove(creatorId);
        }
        if (request.conversationType() == ConversationType.DIRECT && otherUserIds.size() != 1) {
            throw new IllegalArgumentException("Đây là hộp thoại tin nhắn riêng, chỉ có thể có bạn và người nhận!");
        }
        Conversation savedConversation = conversationRepo.save(new Conversation(request.conversationType()));
        List<ConversationMember> membersToSave = new ArrayList<>();
        //Gán role ADMIN cho người tạo cuộc hội thoại
        MemberRole creatorRole = (request.conversationType() == ConversationType.GROUP) ? MemberRole.ADMIN : MemberRole.MEMBER;
        membersToSave.add(new ConversationMember(savedConversation, creator, creatorRole));

        //Thêm các thành viên khác vào nhóm
        if (!otherUserIds.isEmpty()) {
            List<User> otherUsers = usersRepo.findAllById(otherUserIds);
            if (otherUsers.size() != otherUserIds.size()) {
                throw new UserNotFoundException("Một hoặc nhiều người dùng đang được thêm không tồn tại!");
            }
            for (User targetUsers : otherUsers) {
                membersToSave.add(new ConversationMember(savedConversation, targetUsers, MemberRole.MEMBER));
            }
        }
        conversationMemberRepo.saveAll(membersToSave);
        return ConversationResponse.from(savedConversation);
    }
    @Transactional(readOnly = true)
    public ConversationResponse getConversation(Long id) {
        return conversationRepo.findById(id).map(ConversationResponse::from).orElseThrow(() -> new ConversationNotFoundException("Không tìm thấy cuộc trò chuyện với mã " + id));
    }
    @Transactional
    public void deleteByConversationId(Long id, Long currentUserId) {
        if (!conversationRepo.existsById(id)) throw new ConversationNotFoundException("Không tìm thấy cuộc trò chuyện với mã " + id);
        if (!memberService.isAdmin(id, currentUserId)) throw new AccessDeniedException("Bạn không có quyền làm việc này!");
        conversationMemberRepo.deleteByConversation_Id(id);
        conversationRepo.deleteById(id);
    }
    @Transactional(readOnly = true)
    public Page<ConversationResponse> list(Pageable pageable) {
        return conversationRepo.findAll(pageable).map(ConversationResponse::from);
    }
}
