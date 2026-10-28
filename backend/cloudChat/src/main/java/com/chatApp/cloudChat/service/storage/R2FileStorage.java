package com.chatApp.cloudChat.service.storage;

import com.chatApp.cloudChat.exception.AttachmentNotFoundException;
import com.chatApp.cloudChat.exception.StorageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "r2")
public class R2FileStorage implements FileStorage {

    private final S3Client s3;
    private final String bucket;

    public R2FileStorage(S3Client s3, @Value("${app.storage.r2.bucket}") String bucket) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("app.storage.type=r2 but R2_BUCKET is missing");
        }
        this.s3 = s3;
        this.bucket = bucket;
    }

    @Override
    public void store(MultipartFile file, String objectKey, String contentType) {
        try (InputStream in = file.getInputStream()) {
            s3.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(objectKey)
                            .contentType(contentType)
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(in, file.getSize()));
        } catch (IOException e) {
            throw new UncheckedIOException("Không thể đọc tệp tải lên", e);
        } catch (S3Exception e) {
            throw new StorageException("Không thể lưu tệp lên R2", e);
        }
    }

    @Override
    public Resource load(String objectKey) {
        try {
            ResponseInputStream<GetObjectResponse> stream = s3.getObject(
                    GetObjectRequest.builder().bucket(bucket).key(objectKey).build());
            return new InputStreamResource(stream);
        } catch (NoSuchKeyException e) {
            throw new AttachmentNotFoundException("Không tìm thấy tệp trên máy chủ");
        } catch (S3Exception e) {
            throw new StorageException("Không thể tải tệp từ R2", e);
        }
    }

    @Override
    public void delete(String objectKey) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
        } catch (S3Exception e) {
            throw new StorageException("Không thể xóa tệp trên R2", e);
        }
    }
}
