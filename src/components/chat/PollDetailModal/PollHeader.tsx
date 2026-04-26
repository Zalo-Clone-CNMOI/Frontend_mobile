import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

interface PollHeaderProps {
  groupName: string;
  onClose: () => void;
  onMorePress?: () => void;
}

export const PollHeader: React.FC<PollHeaderProps> = ({
  groupName,
  onClose,
  onMorePress,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.headerLeft}>
        <ChevronLeft size={24} color="#000" />
        <View style={styles.headerSeparator} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('pollDetail.title')}</Text>
        <Text style={styles.headerSubtitle}>{groupName}</Text>
      </View>

      <TouchableOpacity style={styles.headerRight} onPress={onMorePress}>
        <MoreHorizontal size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
};
