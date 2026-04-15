import { useAuth } from '@/src/contexts/AuthContext';
import { uploadAvatar } from '@/src/services/avatarService';
import { updateProfile } from '@/src/services/usersApi';
import { useTheme } from '@/src/theme/themeContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from "expo-status-bar";
import { Calendar, Camera, ChevronLeft, FileText, Mail, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  maxLength?: number;
  multiline?: boolean;
  icon: any;
  theme: any;
}

const InputField = React.memo(({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  multiline = false,
  icon: Icon,
  theme,
}: InputFieldProps) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{label}</Text>
    <View style={[styles.inputContainer, { 
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      height: multiline ? 100 : 50,
    }]}>
      {Icon && <Icon size={20} color={theme.colors.primary} style={styles.inputIcon} />}
      <TextInput
        style={[
          styles.textInput,
          { color: theme.colors.text },
          multiline && styles.multilineInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8e8e93"
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  </View>
));

InputField.displayName = 'InputField';

export default function EditPersonalInfoScreen() {
  const router = useRouter();
  const { user: authUser, updateUser } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<any>(null);

  const [fullName, setFullName] = useState(authUser?.name || '');
  const [email, setEmail] = useState(authUser?.email || '');
  const [bio, setBio] = useState(authUser?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState(authUser?.dateOfBirth || '');
  const [gender, setGender] = useState(authUser?.gender || '');
  const [avatarUrl, setAvatarUrl] = useState(authUser?.avatarUrl || '');

  useEffect(() => {
    const changed =
      fullName !== (authUser?.name || '') ||
      email !== (authUser?.email || '') ||
      bio !== (authUser?.bio || '') ||
      dateOfBirth !== (authUser?.dateOfBirth || '') ||
      gender !== (authUser?.gender || '') ||
      avatarUrl !== (authUser?.avatarUrl || '');
    setHasChanges(changed);
  }, [fullName, email, bio, dateOfBirth, gender, avatarUrl, authUser]);

  const handleAvatarUpload = async () => {
    Alert.alert(
      t('edit_personal_info.change_avatar'),
      '',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('edit_personal_info.take_photo'),
          onPress: () => pickImageFromCamera(),
        },
        {
          text: t('edit_personal_info.choose_from_gallery'),
          onPress: () => pickImageFromGallery(),
        },
      ],
    );
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert(t('common.error'), 'Không thể lấy ảnh');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (asset.fileSize && asset.fileSize > maxSize) {
        Alert.alert(t('common.error'), 'Kích thước file quá lớn (tối đa 5MB)');
        return;
      }

      // Store selected file for upload on save
      setSelectedAvatarFile({
        uri: asset.uri,
        name: asset.fileName || `avatar_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
      });

      // Show preview immediately using local URI
      setAvatarUrl(asset.uri);
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error?.message || t('edit_personal_info.avatar_upload_failed'),
      );
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert(t('common.error'), 'Không thể lấy ảnh');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (asset.fileSize && asset.fileSize > maxSize) {
        Alert.alert(t('common.error'), 'Kích thước file quá lớn (tối đa 5MB)');
        return;
      }

      // Store selected file for upload on save
      setSelectedAvatarFile({
        uri: asset.uri,
        name: asset.fileName || `avatar_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
      });

      // Show preview immediately using local URI
      setAvatarUrl(asset.uri);
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error?.message || t('edit_personal_info.avatar_upload_failed'),
      );
    }
  };

  const handleSave = async () => {
    if (!hasChanges) {
      router.back();
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t('common.error'), t('edit_personal_info.invalid_email'));
      return;
    }

    setIsLoading(true);
    try {
      let finalAvatarUrl = avatarUrl;

      // Upload avatar first if there's a new selected file
      if (selectedAvatarFile) {
        try {
          const uploadResult = await uploadAvatar(
            selectedAvatarFile,
            authUser?.id || '',
          );

          finalAvatarUrl = uploadResult.key;
        } catch (uploadError: any) {
          Alert.alert(
            t('common.error'),
            uploadError?.message || t('edit_personal_info.avatar_upload_failed'),
          );
          return;
        }
      }

      const payload: Record<string, string> = {};

      if (fullName.trim() !== (authUser?.name || '')) {
        payload.fullName = fullName.trim();
      }
      if (email.trim() !== (authUser?.email || '')) {
        payload.email = email.trim();
      }
      if (bio.trim() !== (authUser?.bio || '')) {
        payload.bio = bio.trim();
      }
      if (dateOfBirth.trim() !== (authUser?.dateOfBirth || '')) {
        payload.dateOfBirth = dateOfBirth.trim();
      }
      if (gender !== (authUser?.gender || '')) {
        payload.gender = gender;
      }
      // Only include avatarUrl if it changed (either new upload or different from original)
      if (finalAvatarUrl.trim() !== (authUser?.avatarUrl || '')) {
        payload.avatarUrl = finalAvatarUrl.trim();
      }

      const response = await updateProfile(payload);

      if (response?.status === 200) {
        const contextUpdates: Record<string, string> = {};
        if (payload.fullName) contextUpdates.name = payload.fullName;
        if (payload.email) contextUpdates.email = payload.email;
        if (payload.bio) contextUpdates.bio = payload.bio;
        if (payload.dateOfBirth) contextUpdates.dateOfBirth = payload.dateOfBirth;
        if (payload.gender) contextUpdates.gender = payload.gender;
        if (payload.avatarUrl) contextUpdates.avatarUrl = payload.avatarUrl;

        await updateUser?.({
          ...authUser,
          ...contextUpdates,
        });
        
        Alert.alert(
          t('common.success'),
          t('edit_personal_info.save_success'),
          [{ text: t('common.ok'), onPress: () => router.back() }]
        );
      } else {
        throw new Error(t('edit_personal_info.save_failed'));
      }
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error?.message || t('edit_personal_info.save_failed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      
      <StatusBar style={"light"} />
      <View style={[styles.header, { backgroundColor: theme.colors.header, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={theme.colors.textHeader} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textHeader }]}>
          {t('edit_personal_info.title')}
        </Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          disabled={isLoading || !hasChanges}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: avatarUrl || 'https://i.pravatar.cc/150?u=default' }}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleAvatarUpload}
              >
                <Camera size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.changeAvatarButton}
              onPress={handleAvatarUpload}
            >
              <Text style={[styles.changeAvatarText, { color: theme.colors.primary }]}>
                {t('edit_personal_info.change_avatar')}
              </Text>
            </TouchableOpacity>
          </View>

          
          <View style={styles.form}>
            <InputField
              label={t('personal_info.zalo_name')}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('edit_personal_info.enter_name')}
              icon={User}
              maxLength={50}
              theme={theme}
            />

            <InputField
              label={t('personal_info.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('edit_personal_info.enter_email')}
              keyboardType="email-address"
              icon={Mail}
              maxLength={100}
              theme={theme}
            />

            <InputField
              label={t('personal_info.bio')}
              value={bio}
              onChangeText={setBio}
              placeholder={t('edit_personal_info.enter_bio')}
              icon={FileText}
              multiline
              maxLength={200}
              theme={theme}
            />

            <InputField
              label={t('personal_info.date_of_birth')}
              value={dateOfBirth}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '');
                let formatted = cleaned;
                if (cleaned.length >= 5) {
                  formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}`;
                }
                if (cleaned.length >= 7) {
                  formatted = `${formatted.slice(0, 7)}-${cleaned.slice(6, 8)}`;
                }
                setDateOfBirth(formatted);
              }}
              placeholder={t('edit_personal_info.date_format')}
              keyboardType="numeric"
              icon={Calendar}
              maxLength={10}
              theme={theme}
            />

            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                {t('personal_info.gender')}
              </Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { borderColor: theme.colors.border },
                    gender === 'male' && [styles.genderButtonActive, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[
                    styles.genderText,
                    gender === 'male' && styles.genderTextActive,
                  ]}>
                    {t('profile.male')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { borderColor: theme.colors.border },
                    gender === 'female' && [styles.genderButtonActive, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[
                    styles.genderText,
                    gender === 'female' && styles.genderTextActive,
                  ]}>
                    {t('profile.female')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { borderColor: theme.colors.border },
                    gender === 'other' && [styles.genderButtonActive, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => setGender('other')}
                >
                  <Text style={[
                    styles.genderText,
                    gender === 'other' && styles.genderTextActive,
                  ]}>
                    {t('edit_personal_info.other')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0091ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0091ff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changeAvatarButton: {
    marginTop: 12,
  },
  changeAvatarText: {
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    height: '100%',
  },
  multilineInput: {
    paddingTop: 12,
    paddingBottom: 12,
    height: 100,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderButtonActive: {
    borderWidth: 0,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  genderTextActive: {
    color: '#fff',
  },
});
