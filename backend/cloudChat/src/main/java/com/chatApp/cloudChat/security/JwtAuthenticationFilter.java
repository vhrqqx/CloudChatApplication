package com.chatApp.cloudChat.security;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.chatApp.cloudChat.websocket.TokenAuthenticator;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Reads {@code Authorization: Bearer <token>} and puts an {@link AppUserPrincipal} into the
 * security context for this request.
 *
 * <p>Token verification is delegated to {@link TokenAuthenticator}, the same component the
 * WebSocket CONNECT interceptor uses. Deliberately <b>not</b> a Spring bean: Boot would
 * register it in the servlet container as well, running it twice per request. It is
 * instantiated by {@code SecurityConfig} and added with {@code addFilterBefore}.
 *
 * <p>This filter never writes a response. An invalid token simply means "not authenticated";
 * the authorization layer produces the 401.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final TokenAuthenticator tokenAuthenticator;

    public JwtAuthenticationFilter(TokenAuthenticator tokenAuthenticator) {
        this.tokenAuthenticator = tokenAuthenticator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = tokenAuthenticator.authenticate(request.getHeader(HttpHeaders.AUTHORIZATION));
        if (authentication != null) {
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
        } else {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
