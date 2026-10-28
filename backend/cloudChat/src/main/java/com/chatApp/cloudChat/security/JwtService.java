package com.chatApp.cloudChat.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Issues and verifies HS256 access tokens.
 *
 * <p>The subject claim is the user id. Nothing sensitive (password hash, deletion flag) goes
 * into the token; the filter re-reads the user row anyway. The {@code ver} claim carries the
 * account's credential generation (see {@code User#getTokenVersion}): rotation bumps the row's
 * version, so tokens issued for the previous generation stop validating immediately.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(JwtProperties properties) {
        String secret = properties.secret();
        if (secret == null || secret.isBlank()) {
            this.key = Jwts.SIG.HS256.key().build();
            log.warn("JWT_SECRET is not set: using an ephemeral key. Tokens are invalid after restart.");
        } else {
            byte[] decoded = Decoders.BASE64.decode(secret);
            if (decoded.length < MIN_SECRET_BYTES) {
                throw new IllegalStateException(
                        "JWT_SECRET must decode to at least " + MIN_SECRET_BYTES + " bytes (256 bits)");
            }
            this.key = Keys.hmacShaKeyFor(decoded);
        }
        this.ttl = properties.ttl();
    }

    public IssuedToken issue(AppUserPrincipal principal) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(ttl);
        String token = Jwts.builder()
                .subject(principal.getId().toString())
                .claim("email", principal.getEmail())
                .claim("ver", principal.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiresAt);
    }

    /**
     * @throws io.jsonwebtoken.JwtException   if the signature is invalid, the token expired,
     *                                        or the {@code ver} claim is missing
     * @throws NumberFormatException          if the subject is not a user id
     */
    public VerifiedToken parseVerifiedToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        Object rawVersion = claims.get("ver");
        if (!(rawVersion instanceof Number version)) {
            throw new JwtException("Token is missing the credential version claim");
        }
        return new VerifiedToken(Long.valueOf(claims.getSubject()), version.longValue());
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }

    /**
     * The identity and credential generation bound inside a verified token. Callers compare
     * {@link #tokenVersion()} against the user row's current value to reject tokens from an
     * earlier credential generation.
     */
    public record VerifiedToken(Long userId, long tokenVersion) {
    }
}
