package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.SendMessageRequest;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.exception.UserNotFound;
import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.MessageType;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    public MessageService(MessagesRepo messagesRepo, ConversationRepo conversationRepo, ConversationMemberService conversationMemberService, UsersRepo usersRepo) {
        this.messagesRepo = messagesRepo;
        this.conversationRepo = conversationRepo;
        this.conversationMemberService = conversationMemberService;
        this.usersRepo = usersRepo;
    }
    @Transactional(readOnly = true)
    public MessageResponse findByMessageId(Long id, Long conversationId, Long userId) {
        if (conversationMemberService.isMember(conversationId, userId)) throw new IllegalArgumentException("Bạn không có quyền làm việc này!");
        return messagesRepo.findById(id).map(MessageResponse::from).orElseThrow(() -> new MessageNotFoundException("Không tìm thấy tin nhắn với mã "+ id));
    }
    @Transactional
    public MessageResponse sendMessage(Long conversationId, Long senderId, SendMessageRequest request) {
        Conversation conversation = conversationRepo.findById(conversationId).orElseThrow(() -> new ConversationNotFoundException("Không tìm thấy cuộc hội thoại " + conversationId));
        User sender = usersRepo.findById(senderId).orElseThrow(() -> new UserNotFound("Không tìm thấy người dùng + " + senderId));
        if (!conversationMemberService.isMember(conversationId, senderId)) throw new IllegalArgumentException("Bạn không phải là thành viên của cuộc trò chuyện này!");
        Message message = new Message(conversation, sender, request.messageContent(), MessageType.TEXT);
        return MessageResponse.from(messagesRepo.save(message));
    }
    @Transactional
    public MessageResponse editMessage(Long messageId, Long currentUserId, UpdateMessageRequest request) {
        Message message = messagesRepo.findById(messageId).orElseThrow(() -> new MessageNotFoundException("Không tìm thấy tin nhắn với mã" + messageId));
        if (message.getMessageType() == MessageType.ATTACHMENT) throw new IllegalArgumentException("Bạn không thể chỉnh sửa tin nhắn đính kèm tệp");
        if (!message.getSenderId().equals(currentUserId)) throw new IllegalArgumentException("Bạn chỉ có thể sửa tin nhắn của chính mình!");
        message.setContent(request.content());
        return MessageResponse.from(message);
    }
    @Transactional
    public void deleteByMessageId(Long messageId, Long currentUserId) {
        Message message = messagesRepo.findById(messageId).orElseThrow(() -> new MessageNotFoundException("Không tìm thấy tin nhắn với mã " + messageId));
        // Check xem đây có phải là thành viên nhóm hay là quản trị viên trong nhóm hay không
        boolean isSender = message.getSenderId().equals(currentUserId);
        boolean isAdmin = conversationMemberService.isAdmin(message.getConversationId(), currentUserId);
        if (!isSender && !isAdmin) throw new IllegalArgumentException("Bạn không có quyền để làm điều này!");
        messagesRepo.deleteById(messageId);
    }
    @Transactional(readOnly = true)
    public Page<MessageResponse> getMessageByConversation(Long conversationId, Long currentUserId, Pageable pageable) {
        if (!conversationMemberService.isMember(conversationId, currentUserId)) throw new IllegalArgumentException("Bạn không có quyền xem tin nhắn của cuộc trò chuyện này!");
        return messagesRepo.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable).map(MessageResponse::from);
    }
}