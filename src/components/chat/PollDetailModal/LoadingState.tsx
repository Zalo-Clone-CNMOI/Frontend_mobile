import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Text, View } from 'react-native';
import { styles } from './styles';

interface LoadingStateProps {
  visible: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ visible }) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('pollDetail.loading')}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};
