package com.chatApp.cloudChat.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.util.Objects;

@Entity
public class Attachments {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String filename;
    private Long size;
    private String contentType;
    private String objectKey;

    public Attachments() {}

    public Attachments(Long id, String filename, Long size, String contentType, String objectKey) {
        this.id = id;
        this.filename = filename;
        this.size = size;
        this.contentType = contentType;
        this.objectKey = objectKey;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public void setObjectKey(String objectKey) {
        this.objectKey = objectKey;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        Attachments that = (Attachments) o;
        return Objects.equals(id, that.id) && Objects.equals(filename, that.filename) && Objects.equals(size, that.size) && Objects.equals(contentType, that.contentType) && Objects.equals(objectKey, that.objectKey);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, filename, size, contentType, objectKey);
    }
}
