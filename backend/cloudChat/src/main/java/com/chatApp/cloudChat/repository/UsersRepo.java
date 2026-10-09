package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.Users;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsersRepo extends JpaRepository<Users, Long> {
    Users registerUser(Users user);

    public Users findByUserEmail(String email);
    public Users updateUser(Long id, Users updatedUser);
}
