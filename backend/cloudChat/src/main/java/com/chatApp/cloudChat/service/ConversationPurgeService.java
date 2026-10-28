package com.chatApp.cloudChat.service;

import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.chatApp.cloudChat.model.Attachment;
import com.chatApp.cloudChat.model.Message;
import com.chatApp.cloudChat.repository.MessagesRepo;
import com.chatApp.cloudChat.service.storage.FileStorage;

/**
 * Owns the storage-aware purge of a conversation's messages, shared by both lifecycle paths
 * that delete a conversation: admin delete ({@code ConversationService.deleteByConversationId})
 * and automatic deletion when the last member leaves.
 *
 * <p>Purging means two coordinated removals with opposite failure semantics. Deleting the
 * message rows first (which cascades the attachment rows) and committing, then removing the
 * stored objects after commit, can only ever leak an unreachable file — the reverse order
 * would instead strand live rows pointing at deleted bytes, breaking downloads for surviving
 * messages. Orphaned files are the bounded, log-visible failure mode; the direct
 * {@code AttachmentService.deleteById} route delegates its stored-object removal to the
 * same hook.
 */
@Component
public class ConversationPurgeService {

    private static final Logger log = LoggerFactory.getLogger(ConversationPurgeService.class);

    private final MessagesRepo messagesRepo;
    private final FileStorage fileStorage;

    public ConversationPurgeService(MessagesRepo messagesRepo, FileStorage fileStorage) {
        this.messagesRepo = messagesRepo;
        this.fileStorage = fileStorage;
    }

    /**
     * Deletes all message rows of the conversation (the attachments go with them through the
     * entity cascade) and schedules deletion of every stored object. Must run before the
     * conversation row itself is deleted — {@code messages.conversation_id} is a mandatory FK
     * with no database-level cascade. Callers run inside a transaction.
     */
    public void purgeConversationData(Long conversationId) {
        List<Message> messages = messagesRepo.findByConversation_IdOrderByCreatedAtDesc(conversationId, Pageable.unpaged()).getContent();
        List<String> objectKeys = messages.stream()
                .flatMap(message -> message.getAttachments().stream())
                .map(Attachment::getObjectKey)
                .filter(Objects::nonNull)
                .toList();

        messagesRepo.deleteByConversation_Id(conversationId);
        deleteStoredObjectsAfterCommit(objectKeys);
    }

    /**
     * Deletes one message row (attachments cascade with it) and schedules deletion of its
     * stored objects. Used by the single-message delete route.
     */
    public void purgeMessageData(Message message) {
        List<String> objectKeys = message.getAttachments().stream()
                .map(Attachment::getObjectKey)
                .filter(Objects::nonNull)
                .toList();

        messagesRepo.delete(message);
        deleteStoredObjectsAfterCommit(objectKeys);
    }

    /**
     * Deletes the stored objects for {@code objectKeys} once the current transaction commits
     * (immediately when none is active). Storage deletions cannot be rolled back, so they run
     * only after the row deletion is durably committed: the worst failure is an orphaned
     * file, never a dangling row pointing at deleted bytes. A failed object deletion is
     * logged, never fatal — the object becomes a known-keyed orphan instead of silent loss.
     */
    public void deleteStoredObjectsAfterCommit(List<String> objectKeys) {
        if (objectKeys.isEmpty()) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteStoredObjects(objectKeys);
                }
            });
        } else {
            deleteStoredObjects(objectKeys);
        }
    }

    private void deleteStoredObjects(List<String> objectKeys) {
        for (String objectKey : objectKeys) {
            try {
                fileStorage.delete(objectKey);
            } catch (RuntimeException e) {
                // A failed object deletion must not poison the already-committed data change;
                // the object becomes a known-keyed orphan instead of a silently lost one.
                log.warn("Failed to delete stored object {} after conversation purge: {}", objectKey, e.toString());
            }
        }
    }
}
