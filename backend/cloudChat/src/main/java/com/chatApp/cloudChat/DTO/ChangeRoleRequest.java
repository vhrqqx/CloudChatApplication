package com.chatApp.cloudChat.DTO;

import com.chatApp.cloudChat.model.MemberRole;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(@NotNull MemberRole role) {

}
