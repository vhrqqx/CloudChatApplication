package com.chatApp.cloudChat.service;

import java.util.Optional;

import com.chatApp.cloudChat.model.ConversationMember;
import com.chatApp.cloudChat.repository.ConversationMemberRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatApp.cloudChat.DTO.RegisterRequest;
import com.chatApp.cloudChat.DTO.UpdateUserRequest;
import com.chatApp.cloudChat.DTO.UserResponse;
import com.chatApp.cloudChat.exception.EmailAlreadyInUseException;
import com.chatApp.cloudChat.exception.UserNotFound;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.UsersRepo;

@Service
public class UserService {
    private final UsersRepo usersRepo;
    private final PasswordEncoder passwordEncoder;

    public UserService(UsersRepo usersRepo, PasswordEncoder passwordEncoder) {
        this.usersRepo = usersRepo;
        this.passwordEncoder = passwordEncoder;
    }
    @Transactional
    public UserResponse registerUser(RegisterRequest request) {
        String email = request.userEmail().trim().toLowerCase();
        if (usersRepo.existsByUserEmail(email)) throw new EmailAlreadyInUseException("Email đã được sử dụng!");
        User user = new User(request.username(), email, passwordEncoder.encode(request.password()));
        return UserResponse.from(usersRepo.save(user));
    }
    @Transactional(readOnly = true)
    public Optional<User> findByUserEmail(String email) {
        return usersRepo.findByUserEmail(email);
    }
    @Transactional(readOnly = true)
    public UserResponse findByUserId(Long id) {
        return usersRepo.findById(id).map(UserResponse::from).orElseThrow(() -> new UserNotFound("Không tìm thấy người dùng với mã "+ id));
    }
    @Transactional
    public UserResponse updateUsername(Long id, UpdateUserRequest request) {
        User user = usersRepo.findById(id).orElseThrow(() -> new UserNotFound("Không tìm thấy người dùng với mã "+ id));
        user.setUsername(request.username());
        return UserResponse.from(user);
    }
    @Transactional
    public void deleteByUserId(Long id) {
        if (!usersRepo.existsById(id)) throw new UserNotFound("Không tìm thấy người dùng với mã "+ id);
        usersRepo.deleteById(id);
    }
    @Transactional(readOnly = true)
    public Page<UserResponse> getAll(Pageable pageable) {
        return usersRepo.findAll(pageable).map(UserResponse::from);
    }
}
