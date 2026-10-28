package com.chatApp.cloudChat.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorage {
    void store(MultipartFile file, String objectKey, String contentType);
    Resource load(String objectKey);
    void delete(String objectKey);
}
