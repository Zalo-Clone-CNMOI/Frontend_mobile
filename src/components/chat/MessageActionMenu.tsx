import { useTheme } from '@/src/theme/themeContext';
import type { ChatMessage } from '@/src/types/chat';
import * as Clipboard from 'expo-clipboard';
import { Copy, Reply, RotateCcw, Trash2 } from 'lucide-react-native';
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
  onReply: (msg: ChatMessage) => void;
  onRevoke?: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;
  onReact?: (msg: ChatMessage, reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry") => void;
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
  onRevoke,
  onDelete,
  onReact,
}: MessageActionMenuProps) {
  const theme = useTheme();
  const { t } = useTranslation();

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
  const canRevoke = isMe && !message.isRevoked;

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
            {REACTIONS.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={styles.reactionBtn}
                onPress={() => {
                  onReact?.(message, r.type);
                  onClose();
                }}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          
          <View style={styles.grid}>
            
            <TouchableOpacity style={styles.gridItem} onPress={() => { onReply(message); onClose(); }}>
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

            
            {canRevoke && (
              <TouchableOpacity style={styles.gridItem} onPress={() => { onRevoke?.(message); onClose(); }}>
                <View style={[styles.iconBox, { borderColor: theme.colors.border }]}>
                  <RotateCcw size={24} color="#f59e0b" />
                </View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>{t('chat.revoke', { defaultValue: 'Thu hồi' })}</Text>
              </TouchableOpacity>
            )}

            
            <TouchableOpacity style={styles.gridItem} onPress={() => { onDelete(message); onClose(); }}>
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
});
