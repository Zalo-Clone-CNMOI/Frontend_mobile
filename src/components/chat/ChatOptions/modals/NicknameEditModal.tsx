import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../styles';

interface NicknameEditModalProps {
  visible: boolean;
  theme: any;
  value: string;
  updating: boolean;
  onClose: () => void;
  onChangeText: (text: string) => void;
  onSave: () => void;
}

export const NicknameEditModal: React.FC<NicknameEditModalProps> = ({
  visible,
  theme,
  value,
  updating,
  onClose,
  onChangeText,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {t('chat_options.edit_nickname')}
          </Text>

          <View style={styles.nicknameInputContainer}>
            <TextInput
              style={[
                styles.nicknameInput,
                { color: theme.colors.text, backgroundColor: theme.colors.background },
              ]}
              value={value}
              onChangeText={onChangeText}
              placeholder={t('chat_options.enter_nickname')}
              placeholderTextColor={theme.colors.icon}
              maxLength={100}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.colors.primary, opacity: updating ? 0.5 : 1 },
              ]}
              onPress={onSave}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};
