package com.chatApp.cloudChat.controller;

import com.chatApp.cloudChat.DTO.AddMemberRequest;
import com.chatApp.cloudChat.DTO.ChangeRoleRequest;
import com.chatApp.cloudChat.DTO.MemberResponse;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.ConversationMemberService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public List<MemberResponse> listMember(@RequestParam Long conversationId,
                                           @AuthenticationPrincipal AppUserPrincipal principal) {
        return memberService.getMembersByConversation(conversationId, principal.getId());
    }

    @PostMapping
    public ResponseEntity<MemberResponse> addMember(@Valid @RequestBody AddMemberRequest request,
                                                    @RequestParam Long conversationId,
                                                    @AuthenticationPrincipal AppUserPrincipal principal) {
        MemberResponse member = memberService.addMember(conversationId, principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }

    @PatchMapping("/{userId}")
    public ResponseEntity<MemberResponse> changeRole(@PathVariable Long userId,
                                                     @RequestParam Long conversationId,
                                                     @AuthenticationPrincipal AppUserPrincipal principal,
                                                     @Valid @RequestBody ChangeRoleRequest request) {
        MemberResponse updatedUser = memberService.changeRole(conversationId, principal.getId(), userId, request.role());
        return ResponseEntity.ok(updatedUser);
    }

    @PatchMapping("/{userId}/transfer-admin")
    public ResponseEntity<Void> transferAdmin(@PathVariable Long userId,
            @RequestParam Long conversationId, @AuthenticationPrincipal AppUserPrincipal principal) {
        memberService.transferAdmin(conversationId, principal.getId(), userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long userId,
                                             @RequestParam Long conversationId,
                                             @AuthenticationPrincipal AppUserPrincipal principal) {
        memberService.removeMember(conversationId, principal.getId(), userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> leaveConversation(@RequestParam Long conversationId,
                                                  @AuthenticationPrincipal AppUserPrincipal principal) {
        memberService.leaveConversation(conversationId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
