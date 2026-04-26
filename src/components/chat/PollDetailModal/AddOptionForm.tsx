import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

interface AddOptionFormProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

interface AddOptionButtonProps {
  onPress: () => void;
}

export const AddOptionButton: React.FC<AddOptionButtonProps> = ({ onPress }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={styles.addOptionButton} onPress={onPress}>
      <Text style={styles.addOptionIcon}>+</Text>
      <Text style={styles.addOptionText}>{t('pollDetail.addOption')}</Text>
    </TouchableOpacity>
  );
};

export const AddOptionForm: React.FC<AddOptionFormProps> = ({
  value,
  onChangeText,
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();

  const canSubmit = value.trim().length > 0 && !isLoading;

  console.log('[AddOptionForm] Debug:', {
    value,
    canSubmit,
    isLoading,
  });

  return (
    <View style={styles.addOptionInputContainer}>
      <TextInput
        style={styles.addOptionInput}
        placeholder={t('pollDetail.addOptionPlaceholder')}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        autoFocus
        maxLength={200}
      />
      <TouchableOpacity
        style={[
          styles.addOptionConfirmButton,
          !canSubmit && styles.addOptionConfirmButtonDisabled,
        ]}
        onPress={() => {
          console.log('[AddOptionForm] Confirm button pressed');
          onSubmit();
        }}
        disabled={!canSubmit}
      >
        <Text style={styles.addOptionConfirmText}>{t('common.confirm')}</Text>
      </TouchableOpacity>
    </View>
  );
};
