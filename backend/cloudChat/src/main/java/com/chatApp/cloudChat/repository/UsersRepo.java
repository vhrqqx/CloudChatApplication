package com.chatApp.cloudChat.repository;

import com.chatApp.cloudChat.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsersRepo extends JpaRepository<User, Long> {
    Optional<User> findByUserEmail(String email);
    boolean existsByUserEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByUserEmailAndIsDeletedFalse(String email);
    Optional<User> findByIdAndIsDeletedFalse(Long id);
    Optional<User> findByUserEmailAndIsDeletedFalse(String email);
    Page<User> findAllByIsDeletedFalse(Pageable pagable);
}
