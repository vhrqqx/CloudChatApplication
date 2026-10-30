package com.chatApp.cloudChat.repository;
import com.chatApp.cloudChat.model.NebulaResource;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface NebulaRepo extends JpaRepository<NebulaResource,String> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select n from NebulaResource n where n.id=:id") Optional<NebulaResource> locked(@Param("id") String id);
}
