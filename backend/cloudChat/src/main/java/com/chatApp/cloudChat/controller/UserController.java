package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.RegisterRequest;
import com.chatApp.cloudChat.DTO.UpdatePasswordRequest;
import com.chatApp.cloudChat.DTO.UpdateUserRequest;
import com.chatApp.cloudChat.DTO.UserResponse;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;


import java.net.URI;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
        return userService.findByUserIdAndIsDeletedFalse(id);
    }

    //Get all users
    @GetMapping
    public PagedModel<UserResponse> getUsers(Pageable pageable) {
        return new PagedModel<>(userService.getAll(pageable));
    }

    @PostMapping("/auth/register")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody RegisterRequest request) {
        UserResponse newUser = userService.registerUser(request);
        URI location  = ServletUriComponentsBuilder.fromCurrentRequest().path("{/id}").buildAndExpand(newUser.id()).toUri();
        return ResponseEntity.created(location).body(newUser);
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteByUserId(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me")
    public UserResponse updateUsername(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return userService.updateUsername(id, request);
    }

    @PutMapping("/password/me")
    public ResponseEntity<Void> updatePassword(@PathVariable Long id, @Valid @RequestBody UpdatePasswordRequest request) {
        userService.updatePassword(request, id);
        return ResponseEntity.noContent().build();
    }
}
