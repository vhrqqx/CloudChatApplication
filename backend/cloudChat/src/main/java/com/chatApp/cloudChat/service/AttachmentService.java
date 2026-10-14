package com.chatApp.cloudChat.service;

import com.chatApp.cloudChat.DTO.AttachmentResponse;
import com.chatApp.cloudChat.DTO.SendAttachmentRequest;
import com.chatApp.cloudChat.exception.AttachmentNotFoundException;
import com.chatApp.cloudChat.exception.ConversationNotFoundException;
import com.chatApp.cloudChat.exception.ExceededFileSizeException;
import com.chatApp.cloudChat.exception.UserNotFound;
import com.chatApp.cloudChat.model.Attachment;
import com.chatApp.cloudChat.model.Conversation;
import com.chatApp.cloudChat.model.Message;
import com.chatApp.cloudChat.model.User;
import com.chatApp.cloudChat.repository.AttachmentRepo;
import com.chatApp.cloudChat.repository.ConversationRepo;
import com.chatApp.cloudChat.repository.MessagesRepo;
import com.chatApp.cloudChat.repository.UsersRepo;
import org.apache.tika.Tika;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;
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
    public AttachmentResponse findByMessageId(Long id) {
        return attachmentRepo.findByMessageId(id).map(AttachmentResponse::from).orElseThrow(() -> new AttachmentNotFoundException("Không tìm thấy tệp với mã " + id));
    }
    @Transactional
    public AttachmentResponse sendAttachment(Long conversationId, Long senderId, MultipartFile file) {
        if (!memberService.isMember(conversationId, senderId)) throw new IllegalArgumentException("Bạn không phải là thành viên của cuộc trò chuyện này!");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("File đính kèm không được để trống!");
        if (file.getSize() >= MAX_FILE_SIZE) throw new ExceededFileSizeException("Dung lượng file quá lớn! Vui lòng gửi file có kích cỡ dưới 50MB");
        // Sử dụng Tika để trích xuất content type của file có an toàn hay không
        String originalFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
        String detectedContentType = detectAndValidateMimeType(file, originalFileName);
        String objectKey = "attachments/" + UUID.randomUUID() + "_" + originalFileName;
        Conversation conversation = conversationRepo.findById(conversationId).orElseThrow(() -> new ConversationNotFoundException("Không tìm thấy cuộc hội thoại" + conversationId));
        User sender = usersRepo.findById(senderId).orElseThrow(() -> new UserNotFound("Không tìm thấy người dùng " + senderId));
        Message message = new Message(conversation, sender, "[File:" + originalFileName + "]");
        Message savedMessage = messagesRepo.save(message);
        Attachment attachment = new Attachment(savedMessage, originalFileName, file.getSize(), detectedContentType, objectKey);
        return AttachmentResponse.from(attachment);
    }
    @Transactional
    public void deleteById(Long id) {
        if (!attachmentRepo.existsByMessageId(id)) throw new AttachmentNotFoundException("Không tìm thấy tệp với mã " + id);
        attachmentRepo.deleteById(id);
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
