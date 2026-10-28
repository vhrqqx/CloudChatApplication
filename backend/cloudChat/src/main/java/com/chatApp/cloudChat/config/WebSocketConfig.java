package com.chatApp.cloudChat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

import com.chatApp.cloudChat.websocket.StompAuthorizationInterceptor;
import com.chatApp.cloudChat.websocket.StompSessionRegistry;

/**
 * Raw WebSocket (no SockJS) with STOMP frame semantics, in-memory simple broker.
 *
 * <p>The endpoint is {@code permitAll} in SecurityConfig because the handshake cannot carry
 * the Authorization header; identity is established at CONNECT by
 * {@link StompAuthorizationInterceptor}.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Same origins as REST CORS on purpose (security plan property). For the file:// smoke
    // page, run with CORS_ALLOWED_ORIGINS="*" (dev only) — a mismatch shows up as the classic
    // "WebSocket immediately closed" that looks like a server bug.
    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    private final StompAuthorizationInterceptor stompAuthorizationInterceptor;
    private final StompSessionRegistry stompSessionRegistry;

    public WebSocketConfig(StompAuthorizationInterceptor stompAuthorizationInterceptor,
                           StompSessionRegistry stompSessionRegistry) {
        this.stompAuthorizationInterceptor = stompAuthorizationInterceptor;
        this.stompSessionRegistry = stompSessionRegistry;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[] { 10000, 10000 })
                .setTaskScheduler(heartbeatScheduler());
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket-level origin check (independent of REST CORS, enforced at the handshake).
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOrigins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthorizationInterceptor);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Frames, not files: REST stays the path for 50MB attachments.
        registration.setMessageSizeLimit(256 * 1024)
                .setSendTimeLimit(10_000)
                .setSendBufferSizeLimit(1024 * 1024);
        // Sessions join the revocation registry at the raw handshake (see StompSessionRegistry).
        registration.addDecoratorFactory(stompSessionRegistry);
    }

    /**
     * The simple broker heartbeat needs a scheduler of its own. Heartbeats are not decoration:
     * Tomcat times out idle TCP connections and proxies kill silent ones; heartbeats keep the
     * socket alive and surface a dead peer within ~20s.
     */
    @Bean
    public TaskScheduler heartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat");
        scheduler.initialize();
        return scheduler;
    }
}
