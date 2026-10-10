package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.Users;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.jspecify.annotations.NullMarked;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    // Constructor Injection
    private final UsersRepo usersRepo;
    private final PasswordEncoder passwordEncoder;

    public UserService(UsersRepo usersRepo, PasswordEncoder passwordEncoder) {
        this.usersRepo = usersRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public Users registerUser(Users user) {
        String hashedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(hashedPassword);
        return usersRepo.save(user);
    }
    public Users findByUserEmail(String email) {
        return usersRepo.findByUserEmail(email);
    }
    public Optional<Users> findByUserId(Long id) {
        return usersRepo.findById(id);
    }
    public void deleteByUserId(Long id) {
        usersRepo.deleteById(id);
    }
    public Users updateUser(Long id, Users updatedUser) {
        updatedUser.setId(id);
        return usersRepo.save(updatedUser);
    }
    public List<Users> getAllUsers() {
        return usersRepo.findAll();
    }
    public boolean verifyLogin(String email, String rawPassword) {
        Users existingUser = usersRepo.findByUserEmail(email);
        if (existingUser == null) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, existingUser.getPassword());
    }
}
