package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.Messages;
import com.chatApp.cloudChat.repository.MessagesRepo;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class MessageService {
    private final MessagesRepo messagesRepo;
    public MessageService(MessagesRepo messagesRepo) {
        this.messagesRepo = messagesRepo;
    }
    public Optional<Messages> findByMessageId(Long id) {
        return messagesRepo.findById(id);
    }
    public Messages editMessage(Long messageId, Messages updatedMessage) {
        updatedMessage.setMessageId(messageId);
        return messagesRepo.save(updatedMessage);
    }
    public void deleteByMessageId(Long id) {
        messagesRepo.deleteById(id);
    }
}
