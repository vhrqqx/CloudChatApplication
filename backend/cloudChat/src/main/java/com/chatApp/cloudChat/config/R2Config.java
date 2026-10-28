package com.chatApp.cloudChat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;
import java.time.Duration;

@Configuration
public class R2Config {

    @Bean
    @ConditionalOnProperty(name = "app.storage.type", havingValue = "r2")
    public S3Client r2Client(
            @Value("${app.storage.r2.account-id}") String accountId,
            @Value("${app.storage.r2.access-key-id}") String accessKeyId,
            @Value("${app.storage.r2.secret-access-key}") String secretAccessKey) {

        // Fail fast: with STORAGE_TYPE=r2 but unset R2_* vars, the endpoint
        // becomes https://.r2.cloudflarestorage.com and you get a confusing
        // DNS/TLS failure instead of a clear one.
        if (accountId.isBlank() || accessKeyId.isBlank() || secretAccessKey.isBlank()) {
            throw new IllegalStateException(
                    "app.storage.type=r2 but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are missing");
        }

        return S3Client.builder()
                .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .forcePathStyle(true)
                .httpClientBuilder(UrlConnectionHttpClient.builder()
                        .connectionTimeout(Duration.ofSeconds(5))
                        .socketTimeout(Duration.ofSeconds(60)))
                .overrideConfiguration(c -> c
                        .apiCallTimeout(Duration.ofSeconds(90))
                        .apiCallAttemptTimeout(Duration.ofSeconds(30)))
                .build();
    }
}
