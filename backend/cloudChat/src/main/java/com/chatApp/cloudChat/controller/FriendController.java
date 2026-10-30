package com.chatApp.cloudChat.controller;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chatApp.cloudChat.DTO.ContactsResponse;
import com.chatApp.cloudChat.DTO.CreateFriendRequest;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.FriendService;

@RestController
@RequestMapping("/api/v1/friend-request")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @DeleteMapping("/friend/{userId}")
    public ResponseEntity<Void> unfriend(@PathVariable Long userId, @AuthenticationPrincipal AppUserPrincipal principal) {
        friendService.unfriend(principal.getId(), userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ContactsResponse contacts(@AuthenticationPrincipal AppUserPrincipal principal) {
        return friendService.contacts(principal.getId());
    }

    @PostMapping
    public ResponseEntity<String> send(@RequestBody CreateFriendRequest request,
                                       @AuthenticationPrincipal AppUserPrincipal principal) {
        String id = friendService.send(principal.getId(), request);
        return ResponseEntity.created(URI.create("/api/v1/friend-request/" + id)).body(id);
    }

    @PostMapping("/{requestId}/accept")
    public ResponseEntity<Void> accept(@PathVariable Long requestId,
                                       @AuthenticationPrincipal AppUserPrincipal principal) {
        friendService.accept(principal.getId(), requestId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{requestId}/decline")
    public ResponseEntity<Void> decline(@PathVariable Long requestId,
                                        @AuthenticationPrincipal AppUserPrincipal principal) {
        friendService.decline(principal.getId(), requestId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<Void> cancel(@PathVariable Long requestId,
                                       @AuthenticationPrincipal AppUserPrincipal principal) {
        friendService.cancel(principal.getId(), requestId);
        return ResponseEntity.noContent().build();
    }
}
