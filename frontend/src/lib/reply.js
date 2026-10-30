import { stickerOf } from '../data/stickers.js';

export function parseReply(content) {
  const match = /^\[Reply to: (\d+) \| ([^\]\n]+)\]: ([^\n]*)\n([\s\S]*)$/.exec(content ?? '');
  return match ? { originalMessageId: match[1], senderName: match[2], content: match[3], text: match[4] } : null;
}

export function replyExcerpt(content) {
  const value = parseReply(content)?.text ?? content ?? '';
  return (stickerOf(value) ? '[Nhãn dán]' : value.replace(/^\[File:(.*)\]$/, '[Tệp: $1]')).replace(/[\r\n]+/g, ' ').slice(0, 240);
}

export function replyQuoteContent(reply) {
  const value = parseReply(reply.content)?.text ?? reply.content ?? '';
  if (stickerOf(value)) return value;
  const attachment = reply.attachment;
  if (attachment?.id && (/^image\//i.test(attachment.contentType ?? '') || /\.(jpe?g|png|webp|gif|bmp|svg|heic)$/i.test(attachment.filename ?? ''))) {
    return `[QuoteImage:${attachment.id}:${encodeURIComponent(attachment.filename ?? 'Hình ảnh')}]`;
  }
  return replyExcerpt(value);
}

export function replyPrefix(reply) {
  if (!reply) return '';
  const name = String(reply.senderName).replace(/[\]\r\n|]/g, ' ').slice(0, 50);
  return `[Reply to: ${reply.originalMessageId} | ${name}]: ${replyQuoteContent(reply)}\n`;
}

export function serializeReply(reply, text) {
  const content = replyPrefix(reply) + text;
  if (content.length > 2000) throw new Error('Tin trả lời vượt quá 2000 ký tự. Vui lòng rút ngắn nội dung.');
  return content;
}
