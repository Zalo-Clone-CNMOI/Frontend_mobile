import { ChevronLeft, Settings } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

interface ChatOptionsHeaderProps {
  theme: any;
  onClose: () => void;
  onSettingsPress?: () => void;
}

export const ChatOptionsHeader: React.FC<ChatOptionsHeaderProps> = ({
  theme,
  onClose,
  onSettingsPress,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity onPress={onClose} style={styles.headerLeft}>
        <ChevronLeft size={24} color={theme.colors.text} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('chat_options.title')}
        </Text>
      </TouchableOpacity>
      {onSettingsPress && (
        <TouchableOpacity onPress={onSettingsPress}>
          <Settings size={24} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};
