package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.model.Users;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.jspecify.annotations.NullMarked;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@NullMarked
public class UserService {
    // Constructor Injection
    private final UsersRepo usersRepo;

    public UserService(UsersRepo usersRepo) {
        this.usersRepo = usersRepo;
    }

    public Users registerUser(Users user) {
        usersRepo.save(user);
        return user;
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
}
