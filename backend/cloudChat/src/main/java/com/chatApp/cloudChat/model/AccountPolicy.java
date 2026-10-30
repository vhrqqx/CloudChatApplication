package com.chatApp.cloudChat.model;
import jakarta.persistence.*;
@Entity
public class AccountPolicy {
 @Id public String id;
 @Column(nullable=false) public Long ownerId;
 @Column(nullable=false) public Long targetId;
 public boolean blocked;
 public boolean hidden;
 public AccountPolicy() {}
}
