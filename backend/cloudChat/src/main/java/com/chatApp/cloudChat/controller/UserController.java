package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.UpdatePasswordRequest;
import com.chatApp.cloudChat.DTO.UpdateUserRequest;
import com.chatApp.cloudChat.DTO.UserResponse;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Reading another user's public profile is fine; UserResponse never exposes the password.
    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
        return userService.findByUserIdAndIsDeletedFalse(id);
    }

    //Get all users
    @GetMapping
    public PagedModel<UserResponse> getUsers(Pageable pageable) {
        return new PagedModel<>(userService.getAll(pageable));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMe(@AuthenticationPrincipal AppUserPrincipal principal) {
        userService.deleteByUserId(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me")
    public UserResponse updateMyUsername(@AuthenticationPrincipal AppUserPrincipal principal,
                                         @Valid @RequestBody UpdateUserRequest request) {
        return userService.updateUsername(principal.getId(), request);
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> updateMyPassword(@AuthenticationPrincipal AppUserPrincipal principal,
                                                 @Valid @RequestBody UpdatePasswordRequest request) {
        userService.updatePassword(request, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
