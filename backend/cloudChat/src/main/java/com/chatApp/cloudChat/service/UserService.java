package com.chatApp.cloudChat.service;

import java.util.Optional;

import com.chatApp.cloudChat.DTO.*;
import com.chatApp.cloudChat.exception.InvalidCurrentPasswordException;
import com.chatApp.cloudChat.exception.UserNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatApp.cloudChat.exception.EmailAlreadyInUseException;
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
        if (usersRepo.existsByUserEmailAndIsDeletedFalse(email)) throw new EmailAlreadyInUseException("Email đã được sử dụng!");
        User user = new User(request.username(), email, passwordEncoder.encode(request.password()));
        return UserResponse.from(usersRepo.save(user));
    }

    @Transactional(readOnly = true)
    public Optional<User> findByUserEmail(String email) {
        return usersRepo.findByUserEmailAndIsDeletedFalse(email.trim().toLowerCase());
    }

    // For checking the database
    @Transactional(readOnly = true)
    public UserResponse findByUserId(Long id) {
        return usersRepo.findById(id).map(UserResponse::from).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng " + id));
    }

    @Transactional(readOnly = true)
    public UserResponse findByUserIdAndIsDeletedFalse(Long id) {
        return usersRepo.findByUserIdAndIsDeletedFalse(id).map(UserResponse::from).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với mã "+ id));
    }
    @Transactional
    public UserResponse updateUsername(Long id, UpdateUserRequest request) {
        User user = usersRepo.findById(id).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với mã "+ id));
        user.setUsername(request.username());
        return UserResponse.from(user);
    }
    @Transactional
    public void updatePassword(UpdatePasswordRequest request, Long userId) {
        User user = usersRepo.findById(userId).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng " + userId));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) throw new InvalidCurrentPasswordException("Mật khẩu hiện tại không đúng!");
        user.setPassword(passwordEncoder.encode(request.newPassword()));
    }
    @Transactional
    public void deleteByUserId(Long id) {
        User user = usersRepo.findById(id).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng " + id));
        if (user.isDeleted()) throw new UserNotFoundException("Người dùng đã bị xóa trước đấy!");
        user.markAsDeleted();
        }
    @Transactional(readOnly = true)
    public Page<UserResponse> getAll(Pageable pageable) {
        return usersRepo.findAllByIsDeletedFalse(pageable).map(UserResponse::from);
    }
}
