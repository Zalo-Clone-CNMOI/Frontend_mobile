import type { ChatMessage, Attachment } from '@/src/types/chat';

export type PreviewType = 'image' | 'video' | 'file' | 'voice' | 'text' | 'deleted';

/**
 * Detect the preview type from a message
 */
export const detectPreviewTypeFromMessage = (message: ChatMessage): PreviewType => {
  const attachments = message.attachments || [];
  const body = (message.text || message.content || '').replace(/\u200B/g, '').trim();
  
  // Check for voice messages
  if (attachments.some((att: Attachment) => att.content_type?.startsWith('audio/'))) {
    return 'voice';
  }
  
  // Check for images
  if (attachments.some((att: Attachment) => att.type === 'image' || att.content_type?.startsWith('image/'))) {
    return 'image';
  }
  
  // Check for videos
  if (attachments.some((att: Attachment) => att.type === 'video' || att.content_type?.startsWith('video/'))) {
    return 'video';
  }
  
  // Check for files/documents
  if (attachments.some((att: Attachment) => att.type === 'document' || att.content_type?.startsWith('application/'))) {
    return 'file';
  }
  
  // Check if message is deleted/revoked
  if (message.isRevoked || (message.deletedFor && message.deletedFor.length > 0)) {
    return 'deleted';
  }
  
  // Default to text
  return body ? 'text' : 'deleted';
};

/**
 * Format preview content based on message type
 */
export const formatPreviewContent = (message: ChatMessage, t?: (key: string, options?: any) => string): string => {
  const previewType = detectPreviewTypeFromMessage(message);
  const body = (message.text || message.content || '').replace(/\u200B/g, '').trim();
  
  switch (previewType) {
    case 'image':
      return t ? t('chat.sent_image', { defaultValue: 'Đã gửi 1 ảnh' }) : 'Đã gửi 1 ảnh';
    case 'video':
      return t ? t('chat.sent_video', { defaultValue: 'Đã gửi 1 video' }) : 'Đã gửi 1 video';
    case 'file':
      return t ? t('chat.sent_file', { defaultValue: 'Đã gửi 1 tệp đính kèm' }) : 'Đã gửi 1 tệp đính kèm';
    case 'voice':
      return t ? t('chat.sent_voice', { defaultValue: 'Tin nhắn thoại' }) : 'Tin nhắn thoại';
    case 'deleted':
      return '';
    case 'text':
    default:
      return body;
  }
};
