import React from 'react';
import { View } from 'react-native';
import { File, Film, Image as ImageIcon, MapPin, User, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { OptionButton } from './OptionButton';
import { styles } from '../styles';

interface MoreOptionsProps {
  onPickDocument: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onClose: () => void;
  theme: any;
}

export const MoreOptions: React.FC<MoreOptionsProps> = ({
  onPickDocument,
  onPickImage,
  onPickVideo,
  onClose,
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.moreBoard}>
      <OptionButton title={t('chat.file')} Icon={File} onPress={onPickDocument} theme={theme} />
      <OptionButton title="Hình ảnh" Icon={ImageIcon} onPress={onPickImage} theme={theme} />
      <OptionButton title="Video" Icon={Film} onPress={onPickVideo} theme={theme} />
      <OptionButton title={t('chat.location')} Icon={MapPin} onPress={() => {}} theme={theme} />
      <OptionButton title={t('chat.contact')} Icon={User} onPress={() => {}} theme={theme} />
      <OptionButton title={t('chat.document')} Icon={FileText} onPress={onPickDocument} theme={theme} />
    </View>
  );
};
