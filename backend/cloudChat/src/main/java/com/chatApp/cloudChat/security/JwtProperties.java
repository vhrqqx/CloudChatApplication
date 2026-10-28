package com.chatApp.cloudChat.security;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;


@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration ttl) {

    public JwtProperties {
        if (ttl == null) {
            ttl = Duration.ofHours(12);
        }
    }
}
