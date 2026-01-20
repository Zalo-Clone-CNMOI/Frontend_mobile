import { useTheme } from '@/src/theme/themeContext';
import { Flag, MessageCircle, Send, Share } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type PostOptionsProps = {
  postId: string;
  postContent: string;
  postAuthor: string;
  postImages?: string[];
  onChatWithAuthor?: (authorId: string) => void;
  onSharePost?: (content: string, images?: string[]) => void;
  visible: boolean;
  onClose: () => void;
};

export function PostOptions({
  postId,
  postContent,
  postAuthor,
  postImages,
  onChatWithAuthor,
  onSharePost,
  visible,
  onClose,
}: PostOptionsProps) {
  const theme = useTheme();

  const {t} = useTranslation();

  const handleChatWithAuthor = useCallback(() => {
    onClose();
    onChatWithAuthor?.(postId);
  }, [postId, onChatWithAuthor, onClose]);

  const handleSharePost = useCallback(() => {
    onClose();
    onSharePost?.(postContent, postImages);
  }, [postContent, postImages, onSharePost, onClose]);

  const handleSendPost = useCallback(() => {
    onClose();
    Alert.alert(t('screenPostOptions.send_post'), t('screenPostOptions.send_post_to_friends'));
  }, [onClose]);

  const handleReportPost = useCallback(() => {
    onClose();
    Alert.alert(t('screenPostOptions.report_post'), t('screenPostOptions.report_post_functionality_would_be_implemented_here'));
  }, [onClose]);



  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('screenPostOptions.postOptions')}
          </Text>
          
          <View style={styles.optionsContainer}>
            <Pressable style={styles.option} onPress={handleChatWithAuthor}>
              <MessageCircle size={20} color={theme.colors.icon} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {t('screenPostOptions.chat_with_author')} {postAuthor}
              </Text>
            </Pressable>

            <Pressable style={styles.option} onPress={handleSharePost}>
              <Share size={20} color={theme.colors.icon} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {t('screenPostOptions.share_post')}
              </Text>
            </Pressable>

            <Pressable style={styles.option} onPress={handleSendPost}>
              <Send size={20} color={theme.colors.icon} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {t('screenPostOptions.send_post')}
              </Text>
            </Pressable>

            <Pressable style={styles.option} onPress={handleReportPost}>
              <Flag size={20} color={theme.colors.icon} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {t('screenPostOptions.report_post')}
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelText, { color: theme.colors.primary }]}>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
