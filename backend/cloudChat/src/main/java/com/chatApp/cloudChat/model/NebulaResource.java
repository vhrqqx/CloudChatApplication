package com.chatApp.cloudChat.model;
import jakarta.persistence.*;
@Entity
public class NebulaResource {
 @Id public String id;
 public String type;
 public Long roomId;
 public Long ownerId;
 @Lob @Column(columnDefinition="CLOB") public String payload;
 public NebulaResource() {}
}
