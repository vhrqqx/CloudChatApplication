package com.chatApp.cloudChat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.chatApp.cloudChat.model.FriendRequest;
import com.chatApp.cloudChat.model.FriendStatus;

@Repository
public interface FriendRequestRepo extends JpaRepository<FriendRequest, Long> {

    boolean existsBySenderIdAndReceiverId(Long senderId, Long receiverId);

    List<FriendRequest> findByReceiver_IdAndStatus(Long receiverId, FriendStatus status);

    List<FriendRequest> findBySender_IdAndStatus(Long senderId, FriendStatus status);


    @Query("select (count(f) > 0) from FriendRequest f "
            + "where (f.sender.id = :a and f.receiver.id = :b) "
            + "   or (f.sender.id = :b and f.receiver.id = :a)")
    boolean existsBetween(@Param("a") Long a, @Param("b") Long b);


    @Query("select (count(f) > 0) from FriendRequest f "
            + "where f.status = com.chatApp.cloudChat.model.FriendStatus.ACCEPTED "
            + "  and ((f.sender.id = :a and f.receiver.id = :b) "
            + "    or (f.sender.id = :b and f.receiver.id = :a))")
    boolean existsAcceptedBetween(@Param("a") Long a, @Param("b") Long b);


    @Query("select f from FriendRequest f "
            + "where f.status = com.chatApp.cloudChat.model.FriendStatus.ACCEPTED "
            + "  and (f.sender.id = :uid or f.receiver.id = :uid)")
    List<FriendRequest> findAcceptedOf(@Param("uid") Long uid);
}
