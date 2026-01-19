import { useTheme } from '@/src/theme/themeContext';
import { ChevronLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('change_password.error'), t('change_password.fill_all_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('change_password.error'), t('change_password.password_mismatch'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('change_password.error'), t('change_password.password_too_short'));
      return;
    }

    // TODO: Implement actual password change logic
    Alert.alert(t('change_password.success'), t('change_password.password_changed'), [
      { text: t('common.ok'), onPress: () => router.back() }
    ]);
  };

  const PasswordInput = ({
    value,
    onChangeText,
    placeholder,
    showPassword,
    onToggleVisibility,
  }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    showPassword: boolean;
    onToggleVisibility: () => void;
  }) => (
    <View style={[styles.passwordInputContainer, { borderColor: theme.colors.border }]}>
      <Lock size={20} color="#8e8e93" style={styles.inputIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8e8e93"
        secureTextEntry={!showPassword}
        style={[styles.passwordInput, { color: theme.colors.text }]}
      />
      <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
        {showPassword ? (
          <EyeOff size={20} color="#8e8e93" />
        ) : (
          <Eye size={20} color="#8e8e93" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color={theme.colors.textHeader} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>
          {t('change_password.title')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.form}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('change_password.current_password')}
            </Text>
            <PasswordInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t('change_password.enter_current_password')}
              showPassword={showCurrentPassword}
              onToggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('change_password.new_password')}
            </Text>
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('change_password.enter_new_password')}
              showPassword={showNewPassword}
              onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('change_password.confirm_password')}
            </Text>
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('change_password.enter_confirm_password')}
              showPassword={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleChangePassword}
            >
              <Text style={styles.submitButtonText}>{t('change_password.change_password')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

