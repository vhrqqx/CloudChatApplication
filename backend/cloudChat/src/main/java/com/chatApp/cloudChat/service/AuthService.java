package com.chatApp.cloudChat.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.chatApp.cloudChat.DTO.LoginRequest;
import com.chatApp.cloudChat.DTO.LoginResponse;
import com.chatApp.cloudChat.DTO.UserResponse;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.security.JwtService;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    /**
     * Throws {@link org.springframework.security.core.AuthenticationException} on bad credentials.
     * The global advice turns that into a 401 with a generic message.
     */
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        request.userEmail().trim().toLowerCase(),
                        request.password()));

        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        JwtService.IssuedToken issued = jwtService.issue(principal);

        return new LoginResponse(
                issued.token(),
                "Bearer",
                issued.expiresAt(),
                new UserResponse(principal.getId(), principal.getDisplayName()));
    }
}
