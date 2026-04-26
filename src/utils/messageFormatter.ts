import type { TFunction } from 'i18next';

interface LastMessage {
  type?: string;
  content?: string;
  senderName?: string;
}

interface ChatItem {
  lastMessage?: LastMessage;
  isGroup?: boolean;
}

interface Attachment {
  type?: string;
  content_type?: string;
}

export const getMessageTypeText = (
  type: string,
  attachments: Attachment[],
  t: TFunction
): string => {
  switch (type) {
    case 'image': {
      const imageCount = attachments.filter(
        (a) => a.type === 'image' || a.content_type?.startsWith('image/')
      ).length;
      return imageCount > 1
        ? t('messageType.sentMultipleImages')
        : t('messageType.sentImage');
    }
    case 'video':
      return t('messageType.sentVideo');
    case 'file':
      return t('messageType.sentFile');
    case 'voice':
      return t('messageType.sentVoice');
    default:
      return '';
  }
};

export const getSenderPrefix = (
  lastMessage: LastMessage | undefined,
  isFromMe: boolean,
  t: TFunction
): string => {
  if (isFromMe) {
    return t('messageType.youPrefix');
  }
  const senderName = lastMessage?.senderName || '';
  return senderName ? `${senderName}: ` : '';
};

export const formatLastMessage = (
  item: ChatItem,
  lastMessageData: { fromMe?: boolean; attachments?: Attachment[] },
  t: TFunction
): string => {
  const type = item.lastMessage?.type || 'text';
  const content = item.lastMessage?.content || '';
  const fromMe = lastMessageData.fromMe || false;
  const attachments = lastMessageData.attachments || [];

  // Get content based on type
  const messageContent =
    type === 'text'
      ? content
      : getMessageTypeText(type, attachments, t);

  // Get prefix based on sender
  const prefix = getSenderPrefix(item.lastMessage, fromMe, t);

  return prefix + messageContent;
};
