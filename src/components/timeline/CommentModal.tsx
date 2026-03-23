import { useTheme } from '@/src/theme/themeContext';
import { formatTimeAgo } from '@/src/utils/formatTimeAgo';
import { Send, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: number;
}

export type CommentModalProps = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postAuthor: string;
  comments: Comment[];
  onAddComment: (postId: string, content: string) => void;
  currentUserId?: string;
};

export function CommentModal({
  visible,
  onClose,
  postId,
  postAuthor,
  comments,
  onAddComment,
  currentUserId,
}: CommentModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [commentText, setCommentText] = useState('');

  const handleSendComment = useCallback(() => {
    if (commentText.trim()) {
      onAddComment(postId, commentText.trim());
      setCommentText('');
    }
  }, [commentText, postId, onAddComment]);

  const renderComment = useCallback(({ item }: { item: Comment }) => {
    const isOwnComment = item.userId === currentUserId;
    
    return (
      <View style={styles.commentContainer}>
        <Image
          source={{ uri: item.userAvatar || '' }}
          style={[styles.avatar, { backgroundColor: theme.colors.background }]}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {item.userName}
            </Text>
            <Text style={[styles.commentTime, { color: theme.colors.icon }]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
          <Text style={[styles.commentText, { color: theme.colors.text }]}>
            {item.content}
          </Text>
        </View>
        {isOwnComment && (
          <Pressable
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                t('commentPost.delete_comment'),
                t('commentPost.delete_comment_confirm'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.delete'), style: 'destructive', onPress: () => {} },
                ]
              );
            }}
          >
            <X size={16} color={theme.colors.icon} />
          </Pressable>
        )}
      </View>
    );
  }, [theme, currentUserId, t]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('commentPost.comment_post')} {postAuthor}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Comments List */}
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          style={styles.commentsList}
          contentContainerStyle={styles.commentsContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Comment Input */}
        <View style={[styles.inputContainer, { borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder={t('commentPost.write_comment')}
            placeholderTextColor={theme.colors.icon}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[
              styles.sendButton,
              {
                backgroundColor: commentText.trim() ? theme.colors.primary : theme.colors.icon,
              },
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim()}
          >
            <Send size={20} color={theme.colors.background} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 32,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
