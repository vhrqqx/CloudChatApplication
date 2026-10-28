package com.chatApp.cloudChat.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chatApp.cloudChat.DTO.LoginRequest;
import com.chatApp.cloudChat.DTO.LoginResponse;
import com.chatApp.cloudChat.DTO.RegisterRequest;
import com.chatApp.cloudChat.DTO.UserResponse;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.AuthService;
import com.chatApp.cloudChat.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    /**
     * Serializes registrations so two concurrent attempts for the same email cannot both pass
     * the duplicate check (the users.email unique constraint would otherwise surface as a 500
     * for the loser, distinguishing fresh from registered emails). The lock must wrap the
     * whole service call because the transaction commits when {@code registerUser} returns.
     * A global lock is fine here: registration is low-frequency and the database is
     * single-node by design.
     */
    private static final Object REGISTRATION_LOCK = new Object();

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request) {
        synchronized (REGISTRATION_LOCK) {
            userService.registerUser(request);
        }
        // Uniform response: identical whether or not the email was already registered — no
        // Location header (it used to carry the new id, another existence tell). Validation
        // failures still 400 before this point, but format validity says nothing about
        // account existence.
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(authService.login(request));
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return userService.findByUserIdAndIsDeletedFalse(principal.getId());
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }
}
