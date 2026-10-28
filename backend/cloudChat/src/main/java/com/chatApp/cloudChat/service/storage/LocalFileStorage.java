package com.chatApp.cloudChat.service.storage;

import com.chatApp.cloudChat.exception.AttachmentNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalFileStorage implements FileStorage {

    private final Path root;

    public LocalFileStorage(@Value("${app.storage.root}") String root) {
        this.root = Paths.get(root).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new UncheckedIOException("Không thể tạo thư mục lưu trữ " + this.root, e);
        }
    }

    @Override
    public void store(MultipartFile file, String objectKey, String contentType) {
        Path target = resolve(objectKey);
        try {
            Path parent = target.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Không thể lưu tệp " + objectKey, e);
        }
    }

    @Override
    public Resource load(String objectKey) {
        Resource resource = new FileSystemResource(resolve(objectKey));
        if (!resource.exists()) {
            throw new AttachmentNotFoundException("Không tìm thấy tệp trên máy chủ");
        }
        return resource;
    }

    @Override
    public void delete(String objectKey) {
        try {
            Files.deleteIfExists(resolve(objectKey));
        } catch (IOException e) {
            throw new UncheckedIOException("Không thể xóa tệp " + objectKey, e);
        }
    }

    /**
     * Resolves an object key under the storage root and rejects anything that
     * would escape it (path traversal).
     */
    private Path resolve(String objectKey) {
        Path target = root.resolve(objectKey).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Đường dẫn tệp không hợp lệ");
        }
        return target;
    }
}
