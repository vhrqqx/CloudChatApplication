package com.chatApp.cloudChat.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatApp.cloudChat.repository.UsersRepo;

/**
 * Loads users for {@code DaoAuthenticationProvider}. Soft-deleted accounts are invisible here,
 * so they can never authenticate.
 */
@Service
public class JpaUserDetailsService implements UserDetailsService {

    private final UsersRepo usersRepo;

    public JpaUserDetailsService(UsersRepo usersRepo) {
        this.usersRepo = usersRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalized = email == null ? "" : email.trim().toLowerCase();
        return usersRepo.findByUserEmailAndIsDeletedFalse(normalized)
                .map(AppUserPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }
}
