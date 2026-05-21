import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import * as Clipboard from 'expo-clipboard';
import { Copy, Edit, Forward, Pin, Reply, RotateCcw, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface MessageActionMenuProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage, reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry") => void;
  onReactMultiple?: (message: ChatMessage, reactions: ("like" | "love" | "haha" | "wow" | "sad" | "angry")[]) => void;
  onForward?: (message: ChatMessage) => void;
  onPin?: (message: ChatMessage) => void;
  onUnpin?: (message: ChatMessage) => void;
  isPinned?: boolean;
  conversationType?: 'direct' | 'group';
  userRole?: 'owner' | 'admin' | 'member';
  canPinMessages?: boolean;
}

const REACTIONS = [
  { type: "love", emoji: "❤️" },
  { type: "like", emoji: "👍" },
  { type: "haha", emoji: "😂" },
  { type: "wow", emoji: "😲" },
  { type: "sad", emoji: "😢" },
  { type: "angry", emoji: "😡" },
] as const;

export function MessageActionMenu({
  visible,
  message,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onReactMultiple,
  onForward,
  onPin,
  onUnpin,
  isPinned,
  conversationType = 'direct',
  userRole = 'member',
  canPinMessages,
}: MessageActionMenuProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selectedReactions, setSelectedReactions] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!visible) {
      setSelectedReactions([]);
    }
  }, [visible]);

  if (!message) return null;

  const handleCopy = async () => {
    let contentToCopy = '';
    if (message.text) {
      contentToCopy = message.text;
    } else if (message.fileInfo?.name) {
      contentToCopy = message.fileInfo.name;
    }

    if (contentToCopy) {
      await Clipboard.setStringAsync(contentToCopy);
    }
    onClose();
  };

  const isMe = Boolean(message.fromMe);
  const hasImageAttachment = message.attachments?.some((a: any) => a.type === 'image') || message.type === 'image';
  const canEdit = isMe && !message.isRevoked && !hasImageAttachment;
  const canPin = canPinMessages ?? (conversationType === 'direct' || userRole === 'owner' || userRole === 'admin');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={[styles.menuContainer, { backgroundColor: theme.colors.card }]} 
          onPress={(e) => e.stopPropagation()}
        >
          
          <View style={[styles.reactionsRow, { borderBottomColor: theme.colors.border }]}>
            {REACTIONS.map((r) => {
              const isSelected = selectedReactions.includes(r.type);
              return (
                <TouchableOpacity
                  key={r.type}
                  style={[
                    styles.reactionBtn,
                    isSelected && { backgroundColor: theme.colors.primary + '30', borderRadius: 20 }
                  ]}
                  onPress={() => {
                    setSelectedReactions(prev => {
                      const exists = prev.includes(r.type);
                      if (exists) {
                        return prev.filter(type => type !== r.type);
                      }
                      return [...prev, r.type];
                    });
                  }}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedReactions.length > 0 && (
            <View style={styles.selectedReactionsBar}>
              <Text style={[styles.selectedText, { color: theme.colors.text }]}>
                {selectedReactions.map(type => REACTIONS.find(r => r.type === type)?.emoji).join(' ')}
              </Text>
              <TouchableOpacity
                style={[styles.sendReactionsBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  onReactMultiple?.(message, selectedReactions as any);
                  onClose();
                }}
              >
                <Text style={styles.sendReactionsText}>{t('reactions.send_count', { count: selectedReactions.length, defaultValue: `Gửi ${selectedReactions.length} reaction` })}</Text>
              </TouchableOpacity>
            </View>
          )}

          
          <View style={styles.grid}>

            <TouchableOpacity style={styles.gridItem} onPress={() => { onReply?.(message); onClose(); }}>
              <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                <Reply size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('chat.reply_to', { defaultValue: 'Trả lời' })}</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.gridItem} onPress={handleCopy}>
              <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                <Copy size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('common.copy', { defaultValue: 'Sao chép' })}</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.gridItem} onPress={() => { onForward?.(message); onClose(); }}>
              <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                <Forward size={24} color="#10b981" />
              </View>
              <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('chat.forward', { defaultValue: 'Chuyển tiếp' })}</Text>
            </TouchableOpacity>

            {canPin && (isPinned ? (
              <TouchableOpacity style={styles.gridItem} onPress={() => { onUnpin?.(message); onClose(); }}>
                <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                  <Pin size={24} color="#8b5cf6" />
                </View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('chat.unpin', { defaultValue: 'Bỏ ghim' })}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.gridItem} onPress={() => { onPin?.(message); onClose(); }}>
                <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                  <Pin size={24} color="#8b5cf6" />
                </View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('chat.pin', { defaultValue: 'Ghim' })}</Text>
              </TouchableOpacity>
            ))}

            {canEdit && (
              <TouchableOpacity style={styles.gridItem} onPress={() => { onEdit?.(message); onClose(); }}>
                <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                  <Edit size={24} color="#3b82f6" />
                </View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('common.edit', { defaultValue: 'Chỉnh sửa' })}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.gridItem} onPress={() => { onDelete?.(message); onClose(); }}>
              <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                <Trash2 size={24} color="#ef4444" />
              </View>
              <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('common.delete', { defaultValue: 'Xóa' })}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '85%',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reactionBtn: {
    padding: 4,
    transform: [{ scale: 1.1 }],
  },
  reactionEmoji: {
    fontSize: 26,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  gridItem: {
    alignItems: 'center',
    width: 70,
    marginBottom: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  itemText: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedReactionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  selectedText: {
    fontSize: 20,
    flex: 1,
    marginRight: 12,
  },
  sendReactionsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendReactionsText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
