package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.model.Message;
import com.chatApp.cloudChat.service.MessageService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/message")
public class MessageController {
    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

}
