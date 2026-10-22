package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.AddMemberRequest;
import com.chatApp.cloudChat.DTO.ChangeRoleRequest;
import com.chatApp.cloudChat.DTO.ConversationMemberResponse;
import com.chatApp.cloudChat.DTO.MemberResponse;
import com.chatApp.cloudChat.service.ConversationMemberService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/conversation-member")
public class ConversationMemberController {
    private final ConversationMemberService memberService;
    public ConversationMemberController(ConversationMemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public List<MemberResponse> listMember(@RequestParam Long conversationId, @RequestParam Long currentUserId) {
        return memberService.getMembersByConversation(conversationId, currentUserId);
    }
    @PostMapping
    public ResponseEntity<MemberResponse> addMember(@Valid @RequestBody AddMemberRequest request, @RequestParam Long conversationId, @RequestParam Long currentUserId) {
        MemberResponse member = memberService.addMember(conversationId, currentUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }
    @PatchMapping("/{userId}")
    public ResponseEntity<MemberResponse> changeRole(@PathVariable Long userId, @RequestParam Long conversationId, @RequestParam Long currentUserId, @Valid @RequestBody ChangeRoleRequest request) {
        MemberResponse updatedUser = memberService.changeRole(conversationId, currentUserId, userId, request.role());
        return ResponseEntity.ok(updatedUser);
    }
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long userId, @RequestParam Long conversationId, @RequestParam Long currentUserId) {
        memberService.removeMember(conversationId, currentUserId, userId);
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/me")
    public ResponseEntity<Void> leaveConversation(@RequestParam Long conversationId, @RequestParam Long currentUserId) {
        memberService.leaveConversation(conversationId, currentUserId);
        return ResponseEntity.noContent().build();
    }
}
