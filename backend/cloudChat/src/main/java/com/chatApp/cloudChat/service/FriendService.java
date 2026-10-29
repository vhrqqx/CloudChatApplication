package com.chatApp.cloudChat.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatApp.cloudChat.DTO.ContactsResponse;
import com.chatApp.cloudChat.DTO.CreateFriendRequest;
import com.chatApp.cloudChat.DTO.FriendRequestInfo;
import com.chatApp.cloudChat.DTO.FriendSummary;
import com.chatApp.cloudChat.event.ContactEvent;
import com.chatApp.cloudChat.exception.FriendRequestNotFoundException;
import com.chatApp.cloudChat.exception.UserNotFoundException;
import com.chatApp.cloudChat.model.FriendRequest;
import com.chatApp.cloudChat.model.FriendStatus;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.ConversationMemberRepo;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.FriendRequestRepo;
import com.chatApp.cloudChat.repository.UsersRepo;









@Service
public class FriendService {

    private final FriendRequestRepo friendRepo;
    private final UsersRepo usersRepo;
    private final ConversationRepo conversationRepo;
    private final ConversationMemberRepo memberRepo;
    private final ApplicationEventPublisher eventPublisher;

    public FriendService(FriendRequestRepo friendRepo, UsersRepo usersRepo,
                         ConversationRepo conversationRepo, ConversationMemberRepo memberRepo,
                         ApplicationEventPublisher eventPublisher) {
        this.friendRepo = friendRepo;
        this.usersRepo = usersRepo;
        this.conversationRepo = conversationRepo;
        this.memberRepo = memberRepo;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public String send(Long senderId, CreateFriendRequest request) {
        if (request.receiverId() == null) {
            throw new IllegalArgumentException("Cần có người nhận lời mời.");
        }
        if (request.receiverId().equals(senderId)) {
            throw new IllegalArgumentException("Không thể kết bạn với chính mình.");
        }

        User receiver = usersRepo.findByIdAndIsDeletedFalse(request.receiverId())
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng " + request.receiverId()));

        if (friendRepo.existsBetween(senderId, request.receiverId())) {
            throw new IllegalArgumentException("Hai người đã là bạn bè hoặc đã có lời mời giữa hai người.");
        }

        String sourceName = null;
        if (request.sourceConversationId() != null) {

            if (!memberRepo.existsByConversation_IdAndUser_Id(request.sourceConversationId(), senderId)
                    || !memberRepo.existsByConversation_IdAndUser_Id(request.sourceConversationId(), request.receiverId())) {
                throw new AccessDeniedException("Chỉ có thể gửi lời mời qua cuộc trò chuyện mà hai người đều tham gia.");
            }
            sourceName = conversationName(request.sourceConversationId());
        }

        User sender = usersRepo.findById(senderId)
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng " + senderId));

        FriendRequest fr = new FriendRequest(sender, receiver, request.sourceConversationId());
        FriendRequest saved = friendRepo.save(fr);

        Map<String, Object> payload = new HashMap<>();
        payload.put("kind", "request");
        payload.put("targetId", request.receiverId());
        payload.put("requestId", saved.getId());
        payload.put("senderId", senderId);
        payload.put("senderName", sender.getUsername());
        payload.put("sourceConversationId", request.sourceConversationId());
        payload.put("sourceName", sourceName);
        payload.put("createdAt", saved.getCreatedAt());
        eventPublisher.publishEvent(new ContactEvent(payload));

        return saved.getId().toString();
    }

    @Transactional
    public void accept(Long receiverId, Long requestId) {
        FriendRequest fr = friendRepo.findById(requestId)
                .orElseThrow(() -> new FriendRequestNotFoundException("Không tìm thấy lời mời kết bạn " + requestId));

        if (!receiverId.equals(fr.getReceiverId())) {
            throw new AccessDeniedException("Lời mời kết bạn không gửi cho bạn.");
        }
        if (fr.getStatus() != FriendStatus.PENDING) {
            throw new IllegalArgumentException("Lời mời kết bạn đã được xử lý trước đó.");
        }

        fr.setStatus(FriendStatus.ACCEPTED);
        fr.setRespondedAt(Instant.now());
        friendRepo.save(fr);

        String receiverName = fr.getReceiver().getUsername();
        String senderName = fr.getSender().getUsername();

        publish("accepted", fr.getReceiverId(), Map.of(
                "friendId", fr.getSenderId(),
                "friendName", senderName));
        publish("accepted", fr.getSenderId(), Map.of(
                "friendId", fr.getReceiverId(),
                "friendName", receiverName));
    }

    @Transactional
    public void decline(Long receiverId, Long requestId) {
        FriendRequest fr = friendRepo.findById(requestId)
                .orElseThrow(() -> new FriendRequestNotFoundException("Không tìm thấy lời mời kết bạn " + requestId));
        if (!receiverId.equals(fr.getReceiverId())) {
            throw new AccessDeniedException("Lời mời kết bạn không gửi cho bạn.");
        }
        Long senderId = fr.getSenderId();
        friendRepo.delete(fr);
        publish("declined", senderId, Map.of(
                "targetId", receiverId,
                "requestId", requestId));
    }


    @Transactional
    public void cancel(Long senderId, Long requestId) {
        FriendRequest fr = friendRepo.findById(requestId)
                .orElseThrow(() -> new FriendRequestNotFoundException("Không tìm thấy lời mời kết bạn " + requestId));
        if (!senderId.equals(fr.getSenderId())) {
            throw new AccessDeniedException("Bạn không phải bên gửi lời mời này.");
        }
        friendRepo.delete(fr);
        publish("cancelled", fr.getReceiverId(), Map.of(
                "targetId", senderId,
                "requestId", requestId));
    }

    @Transactional(readOnly = true)
    public ContactsResponse contacts(Long currentUserId) {
        List<FriendSummary> friends = friendRepo.findAcceptedOf(currentUserId).stream()
                .map((fr) -> FriendSummary.from(fr.getSenderId().equals(currentUserId) ? fr.getReceiver() : fr.getSender()))
                .toList();

        List<FriendRequestInfo> incoming = friendRepo.findByReceiver_IdAndStatus(currentUserId, FriendStatus.PENDING).stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map((fr) -> new FriendRequestInfo(
                        fr.getId(),
                        fr.getSenderId(),
                        fr.getSender().getUsername(),
                        fr.getSourceConversationId(),
                        fr.getSourceConversationId() != null ? conversationName(fr.getSourceConversationId()) : null,
                        fr.getCreatedAt()))
                .toList();

        List<FriendRequestInfo> outgoing = friendRepo.findBySender_IdAndStatus(currentUserId, FriendStatus.PENDING).stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map((fr) -> new FriendRequestInfo(
                        fr.getId(),
                        fr.getReceiverId(),
                        fr.getReceiver().getUsername(),
                        null,
                        null,
                        fr.getCreatedAt()))
                .toList();

        return new ContactsResponse(friends, incoming, outgoing);
    }


    @Transactional(readOnly = true)
    public boolean areFriends(Long a, Long b) {
        return friendRepo.existsAcceptedBetween(a, b);
    }


    @Transactional(readOnly = true)
    public List<Long> filterNonFriends(Long userId, List<Long> candidateIds) {
        List<Long> notFriends = new ArrayList<>();
        for (Long id : candidateIds) {
            if (!friendRepo.existsAcceptedBetween(userId, id)) notFriends.add(id);
        }
        return notFriends;
    }

    @Transactional(readOnly = true)
    public int friendCount(Long userId) {
        return friendRepo.findAcceptedOf(userId).size();
    }



    private void publish(String kind, Long targetId, Map<String, Object> extra) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("kind", kind);
        payload.put("targetId", targetId);
        payload.putAll(extra);
        eventPublisher.publishEvent(new ContactEvent(payload));
    }





    private String conversationName(Long conversationId) {
        List<Long> userIds = memberRepo.findByConversation_Id(conversationId).stream()
                .map((m) -> m.getUser().getId())
                .toList();
        if (userIds.isEmpty()) return null;
        Map<Long, String> names = usersRepo.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        return userIds.stream().map((id) -> names.getOrDefault(id, "Unknown")).collect(Collectors.joining(", "));
    }
}
