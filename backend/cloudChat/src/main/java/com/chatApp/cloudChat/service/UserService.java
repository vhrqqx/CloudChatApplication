package com.chatApp.cloudChat.service;

import java.util.Optional;

import com.chatApp.cloudChat.DTO.*;
import com.chatApp.cloudChat.event.SessionRevocationEvent;
import com.chatApp.cloudChat.exception.InvalidCurrentPasswordException;
import com.chatApp.cloudChat.exception.UserNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.UsersRepo;

@Service
public class UserService {
    private final UsersRepo usersRepo;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;

    public UserService(UsersRepo usersRepo, PasswordEncoder passwordEncoder, ApplicationEventPublisher eventPublisher) {
        this.usersRepo = usersRepo;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
    }
    @Transactional
    public void registerUser(RegisterRequest request) {
        // Encode unconditionally: hashing only on the fresh path would make the response
        // time the oracle the uniform-response policy exists to close (a duplicate email
        // must cost the same work as a fresh registration).
        String passwordHash = passwordEncoder.encode(request.password());
        String email = request.userEmail().trim().toLowerCase();
        // Uniform-response policy (see AuthController): a duplicate email is acknowledged
        // exactly like a fresh registration — the caller must not learn whether the email
        // is registered. The login path is sanitized the same way.
        if (usersRepo.existsByUserEmailAndIsDeletedFalse(email)) {
            return;
        }
        usersRepo.save(new User(request.username(), email, passwordHash));
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
        return usersRepo.findByIdAndIsDeletedFalse(id).map(UserResponse::from).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với mã "+ id));
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
        // Invalidate every outstanding access token: tokens carry the credential generation
        // ("ver" claim) and are re-checked against this counter on every request.
        user.bumpTokenVersion();
    }
    @Transactional
    public void deleteByUserId(Long id) {
        User user = usersRepo.findById(id).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng " + id));
        if (user.isDeleted()) throw new UserNotFoundException("Người dùng đã bị xóa trước đấy!");
        user.markAsDeleted();
        // Cut the deleted account's live sessions: the pinned STOMP identity would otherwise
        // keep delivering (e.g. typing broadcasts) until the socket died on its own.
        eventPublisher.publishEvent(new SessionRevocationEvent(user.getId()));
    }
    @Transactional(readOnly = true)
    public Page<UserResponse> getAll(Pageable pageable) {
        return usersRepo.findAllByIsDeletedFalse(pageable).map(UserResponse::from);
    }
}
