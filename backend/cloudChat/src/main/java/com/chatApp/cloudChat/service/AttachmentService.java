package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.AttachmentResponse;
import com.chatApp.cloudChat.exception.AttachmentNotFoundException;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.exception.ExceededFileSizeException;
import com.chatApp.cloudChat.exception.UserNotFoundException;
import com.chatApp.cloudChat.model.*;
import com.chatApp.cloudChat.repository.AttachmentRepo;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.MessagesRepo;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.apache.tika.Tika;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;
import java.util.UUID;


@Service
public class AttachmentService {
    private static final Long MAX_FILE_SIZE = 50L * 1024 * 1024;
    private final AttachmentRepo attachmentRepo;
    private final ConversationMemberService memberService;
    private final Tika tika;

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            // Ảnh
            "image/jpeg", "image/png", "image/webp", "image/gif",
            // Tài liệu & văn bản
            "application/pdf",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",      // .xlsx
            // File nén, âm thanh và audio
            "application/zip",
            "audio/mpeg",
            "video/mp4"
    );
    private final ConversationRepo conversationRepo;
    private final UsersRepo usersRepo;
    private final MessagesRepo messagesRepo;

    public AttachmentService(AttachmentRepo attachmentRepo, ConversationMemberService memberService, Tika tika, ConversationRepo conversationRepo, UsersRepo usersRepo, MessagesRepo messagesRepo) {
        this.attachmentRepo = attachmentRepo;
        this.memberService = memberService;
        this.tika = tika;
        this.conversationRepo = conversationRepo;
        this.usersRepo = usersRepo;
        this.messagesRepo = messagesRepo;
    }
    @Transactional(readOnly = true)
    public AttachmentResponse findByMessageId(Long id, Long userId) {
        Attachment attachment = attachmentRepo.findById(id).orElseThrow(() -> new AttachmentNotFoundException("Không tìm thấy tệp với mã " + id));
        Long conversationId = attachment.getMessage().getConversationId();
        if (!memberService.isMember(conversationId, userId)) throw new AccessDeniedException("Bạn không có quyền làm việc này!");
        return AttachmentResponse.from(attachment);
    }
    @Transactional
    public AttachmentResponse sendAttachment(Long conversationId, Long senderId, MultipartFile file) {
        if (!memberService.isMember(conversationId, senderId)) throw new IllegalArgumentException("Bạn không phải là thành viên của cuộc trò chuyện này!");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("File đính kèm không được để trống!");
        if (file.getSize() >= MAX_FILE_SIZE) throw new ExceededFileSizeException("Dung lượng file quá lớn! Vui lòng gửi file có kích cỡ dưới 50MB");
        // Sử dụng Tika để trích xuất content type của file có an toàn hay không
        String originalFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
        String detectedContentType = detectAndValidateMimeType(file, originalFileName);
        String objectKey = UUID.randomUUID() + "-" + StringUtils.cleanPath(originalFileName).replaceAll("[^A-Za-z0-9._-]", "_");
        Conversation conversation = conversationRepo.findById(conversationId).orElseThrow(() -> new ConversationNotFoundException("Không tìm thấy cuộc hội thoại" + conversationId));
        User sender = usersRepo.findById(senderId).orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng " + senderId));
        // Tạo message và Attachment mới
        Message message = new Message(conversation, sender, "[File:" + originalFileName + "]", MessageType.ATTACHMENT);
        Message savedMessage = messagesRepo.save(message);
        Attachment attachment = new Attachment(savedMessage, originalFileName, file.getSize(), detectedContentType, objectKey);
        attachmentRepo.save(attachment);
        return AttachmentResponse.from(attachment);
    }
    @Transactional
    public void deleteById(Long id, Long conversationId, Long currentUserId) {
        Attachment attachment = attachmentRepo.findById(id).orElseThrow(() -> new AttachmentNotFoundException("Không tìm thấy tệp " + id));
        Message message = attachment.getMessage();
        Long currentConversationId = message.getConversationId();
        if (!currentConversationId.equals(conversationId)) throw new IllegalArgumentException("Tệp không thuộc cuộc hội thoại hiện tại!");
        boolean isMember = message.getSenderId().equals(currentUserId);
        boolean isAdmin = memberService.isAdmin(conversationId, currentUserId);
        if (!isAdmin && !isMember) throw new AccessDeniedException("Bạn không có quyền làm điều này!");
        attachmentRepo.delete(attachment);
    }
    @Transactional(readOnly = true)
    public Page<AttachmentResponse> getAll(Pageable pageable) {
        return attachmentRepo.findAll(pageable).map(AttachmentResponse::from);
    }

    // Hàm kiểm tra nội dung bên trong file
    public String detectAndValidateMimeType(MultipartFile file, String filename) {
        Metadata metadata = new Metadata();
        metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, filename);

        String mimeType;
        try (InputStream is = file.getInputStream()) {
            mimeType = tika.detect(is, metadata);
        } catch (IOException e) {
            throw new IllegalArgumentException("Không thể đọc được định dạng của file");
        }
        if (!ALLOWED_MIME_TYPES.contains(mimeType)) throw new IllegalArgumentException("Định dạng không được hỗ trợ hoặc bị chặn vì lý do an toàn " + mimeType);
        return mimeType;
    }
}
