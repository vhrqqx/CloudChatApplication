package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Users;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsersRepo extends JpaRepository<Users, Long> {
    public Users findByUserEmail(String email);
}
