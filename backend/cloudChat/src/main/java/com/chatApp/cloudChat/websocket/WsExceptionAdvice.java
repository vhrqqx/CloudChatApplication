package com.chatApp.cloudChat.websocket;

import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ControllerAdvice;

import com.chatApp.cloudChat.DTO.WsError;

/**
 * The messaging-stack analog of {@code GlobalHandleException}.
 *
 * <p>{@code @RestControllerAdvice} never sees WebSocket errors: frames are not HTTP requests.
 * Keep this advice separate — the REST stack ignores {@code @MessageExceptionHandler} methods
 * and the messaging stack ignores {@code @ExceptionHandler} methods.
 */
@ControllerAdvice
public class WsExceptionAdvice {

    /**
     * {@code @SendToUser("/queue/errors")} resolves to the session that caused the error — no
     * manual username plumbing. 500s get a generic message so a frame cannot echo internals to
     * a third party.
     */
    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public WsError handle(Exception ex) {
        int status = switch (ex) {
            case AccessDeniedException a -> 403;
            // The messaging one (extends MethodArgumentResolutionException) is thrown by a failed
            // @Valid @Payload. Without this case a blank message — a client error — falls through
            // to the default and comes back as a 500.
            case MethodArgumentNotValidException v -> 400;
            case IllegalArgumentException i -> 400;
            default -> 500;
        };
        String message = status == 500 ? "Unexpected server error." : ex.getMessage();
        return new WsError(status, message);
    }
}
