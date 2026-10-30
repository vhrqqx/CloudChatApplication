package com.chatApp.cloudChat.repository;
import com.chatApp.cloudChat.model.AccountPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AccountPolicyRepo extends JpaRepository<AccountPolicy, String> {
 List<AccountPolicy> findByOwnerId(Long ownerId);
}
