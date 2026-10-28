package com.chatApp.cloudChat.event;

/**
 * Published whenever something revokes a user's authorization in a way that outlives their
 * already-connected sessions — membership removal, self-leave, account deletion. The
 * websocket side listens and closes the affected user's live STOMP sessions, so subscription
 * state cannot outlive the row it was granted from.
 */
public record SessionRevocationEvent(Long userId) {
}
