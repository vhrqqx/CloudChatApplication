package com.chatApp.cloudChat.controller;
import com.chatApp.cloudChat.model.AccountPolicy;
import com.chatApp.cloudChat.service.AccountPolicyService;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/v1/account-policy")
public class AccountPolicyController {
 private final AccountPolicyService service;
 public AccountPolicyController(AccountPolicyService service){this.service=service;}
 public record UpdatePolicy(Boolean blocked,Boolean hidden){}
 @GetMapping public List<AccountPolicy> list(@AuthenticationPrincipal AppUserPrincipal user){return service.list(user.getId());}
 @PatchMapping("/{userId}") public AccountPolicy update(@PathVariable Long userId,@RequestBody UpdatePolicy request,@AuthenticationPrincipal AppUserPrincipal user){return service.update(user.getId(),userId,request.blocked(),request.hidden());}
}
