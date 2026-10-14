package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.LoginRequest;
import com.chatApp.cloudChat.DTO.RegisterRequest;
import com.chatApp.cloudChat.DTO.UserResponse;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.service.UserService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    //Get all users
    @GetMapping
    public PagedModel<UserResponse> getUsers(Pageable pageable) {
        return new PagedModel<>(userService.getAll(pageable));
    }

    @PostMapping("/auth/register")
    public UserResponse registerUser(@RequestBody RegisterRequest request) {
        return userService.registerUser(request);
    }
}

