package com.chatApp.cloudChat.service;
import com.chatApp.cloudChat.model.*;
import com.chatApp.cloudChat.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
@Service
public class AccountPolicyService {
 private final AccountPolicyRepo policies;
 private final UsersRepo users;
 private final ConversationMemberRepo members;
 public AccountPolicyService(AccountPolicyRepo policies, UsersRepo users, ConversationMemberRepo members) { this.policies=policies;this.users=users;this.members=members; }
 @Transactional(readOnly=true)
 public List<AccountPolicy> list(Long owner) { return policies.findByOwnerId(owner); }
 @Transactional
 public AccountPolicy update(Long owner, Long target, Boolean blocked, Boolean hidden) {
  if(owner.equals(target)||!users.existsById(target)) throw new IllegalArgumentException("Tài khoản không hợp lệ.");
  String id=owner+":"+target;
  AccountPolicy policy=policies.findById(id).orElseGet(AccountPolicy::new);
  policy.id=id;policy.ownerId=owner;policy.targetId=target;
  if(blocked!=null)policy.blocked=blocked;
  if(hidden!=null)policy.hidden=hidden;
  return policies.save(policy);
 }
 @Transactional(readOnly=true)
 public void requireUnblocked(Long a,Long b) {
  if(policies.findById(a+":"+b).map(p->p.blocked).orElse(false)||policies.findById(b+":"+a).map(p->p.blocked).orElse(false)) throw new AccessDeniedException("Không thể liên hệ do tài khoản đã bị chặn.");
 }
 @Transactional(readOnly=true)
 public void requireConversationAllowed(Long conversationId,Long sender) {
  List<ConversationMember> rows=members.findByConversation_Id(conversationId);
  if(!rows.isEmpty()&&rows.get(0).getConversation().getConvoType()==ConversationType.DIRECT)
   for(ConversationMember member:rows)if(!member.getUserId().equals(sender))requireUnblocked(sender,member.getUserId());
 }
}
