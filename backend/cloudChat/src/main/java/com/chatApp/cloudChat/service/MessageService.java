package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.SendMessageRequest;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.exception.UserNotFoundException;
import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.MessageType;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatApp.cloudChat.DTO.MessageResponse;
import com.chatApp.cloudChat.DTO.UpdateMessageRequest;
import com.chatApp.cloudChat.exception.MessageNotFoundException;
import com.chatApp.cloudChat.model.Message;
import com.chatApp.cloudChat.repository.MessagesRepo;




@Service
public class MessageService {
    private final MessagesRepo messagesRepo;
    private final ConversationRepo conversationRepo;
    private final ConversationMemberService conversationMemberService;
    private final UsersRepo usersRepo;
    private final ConversationPurgeService purgeService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    public MessageService(MessagesRepo messagesRepo, ConversationRepo conversationRepo, ConversationMemberService conversationMemberService, UsersRepo usersRepo, ConversationPurgeService purgeService, org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.messagesRepo = messagesRepo;
        this.conversationRepo = conversationRepo;
        this.conversationMemberService = conversationMemberService;
        this.usersRepo = usersRepo;
        this.purgeService = purgeService;
        this.eventPublisher = eventPublisher;
    }
    @Transactional(readOnly = true)
    public MessageResponse findByMessageId(Long id, Long conversationId, Long userId) {
        if (!conversationMemberService.isMember(conversationId, userId)) throw new AccessDeniedException("Bạn không có quyền làm việc này!");
        Message message = messagesRepo.findByIdAndConversation_Id(id, conversationId).orElseThrow(() -> new MessageNotFoundException("Tin nhắn không tồn tại!"));
        return MessageResponse.from(message);
    }
    @Transactional
    public MessageResponse sendMessage(Long conversationId, Long senderId, SendMessageRequest request) {
        if (!conversationMemberService.isMember(conversationId, senderId)) throw new AccessDeniedException("Bạn không phải là thành viên của cuộc trò chuyện này!");
        Conversation conversation = conversationRepo.findById(conversationId).orElseThrow(() -> new ConversationNotFoundException("Không tìm thấy cuộc hội thoại " + conversationId));
        User sender = usersRepo.findByIdAndIsDeletedFalse(senderId).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng + " + senderId));
        Message message = new Message(conversation, sender, request.messageContent(), MessageType.TEXT);
        return MessageResponse.from(messagesRepo.save(message));
    }
    @Transactional
    public MessageResponse editMessage(Long messageId, Long currentUserId, UpdateMessageRequest request) {
        Message message = messagesRepo.findById(messageId).orElseThrow(() -> new MessageNotFoundException("Không tìm thấy tin nhắn với mã" + messageId));
        // Non-members get the same 404 as an unknown message id so the route carries no
        // existence oracle; membership alone only narrows the response space.
        if (!conversationMemberService.isMember(message.getConversationId(), currentUserId)) throw new MessageNotFoundException("Không tìm thấy tin nhắn với mã" + messageId);
        if (!message.getSenderId().equals(currentUserId)) throw new AccessDeniedException("Bạn chỉ có thể sửa tin nhắn của chính mình!");
        if (message.getMessageType() == MessageType.ATTACHMENT) throw new IllegalArgumentException("Bạn không thể chỉnh sửa tin nhắn đính kèm tệp");
        message.setContent(request.content());
        return MessageResponse.from(message);
    }
    @Transactional
    public void deleteByMessageId(Long messageId, Long currentUserId) {
        Message message = messagesRepo.findById(messageId).orElseThrow(() -> new MessageNotFoundException("Không tìm thấy tin nhắn với mã " + messageId));
        // Membership gate (parity with editMessage) before the sender/admin split, and a
        // non-member sees the same 404 as an unknown id — no existence probe.
        if (!conversationMemberService.isMember(message.getConversationId(), currentUserId)) throw new MessageNotFoundException("Không tìm thấy tin nhắn với mã " + messageId);
        boolean isSender = message.getSenderId().equals(currentUserId);
        boolean isAdmin = conversationMemberService.isAdmin(message.getConversationId(), currentUserId);
        if (!isSender && !isAdmin) throw new AccessDeniedException("Bạn không có quyền để làm điều này!");
        // Storage-aware delete: the attachment rows cascade away with the message, so the
        // stored objects must be removed too or they become permanent, unidentifiable orphans.
        purgeService.purgeMessageData(message);


        eventPublisher.publishEvent(new com.chatApp.cloudChat.event.MessageDeletedEvent(
                message.getConversationId(), messageId, currentUserId));
    }
    @Transactional(readOnly = true)
    public Page<MessageResponse> getMessageByConversation(Long conversationId, Long currentUserId, Pageable pageable) {
        if (!conversationMemberService.isMember(conversationId, currentUserId)) throw new AccessDeniedException("Bạn không có quyền xem tin nhắn của cuộc trò chuyện này!");
        return messagesRepo.findByConversation_IdOrderByCreatedAtDesc(conversationId, pageable).map(MessageResponse::from);
    }
}