package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.LoginRequest;
import com.chatApp.cloudChat.model.Users;
import com.chatApp.cloudChat.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    //Get all users
    @GetMapping
    public List<Users> getUsers() {
        return userService.getAllUsers();
    }

    @PostMapping("/auth/register")
    public Users registerUser(@RequestBody Users user) {
        return userService.registerUser(user);
    }

    @PostMapping("/auth/login")
    public String loginUser(@RequestBody LoginRequest request) {
        boolean isLoginSuccessful = userService.verifyLogin(request.userEmail(), request.password());
        if (isLoginSuccessful) {
            return "Login successfully!";
        } else {
            return "Error: Invalid Credentials";
        }
    }
}

