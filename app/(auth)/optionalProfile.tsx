import { useAuth } from '@/src/contexts/AuthContext';
import { useOtpRegistration, type Gender } from '@/src/contexts/OtpRegistrationContext';
import * as authApi from '@/src/services/authApi';
import type { UserInfo } from '@/src/services/authService';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const friendlyRegisterError = (err: any): string => {
  const status = err?.response?.status;
  const message = String(err?.response?.data?.message || err?.message || '');

  if (status === 409) return 'Số điện thoại đã tồn tại. Vui lòng đăng nhập.';
  if (status === 400) return 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.';
  if (message.toLowerCase().includes('network')) return 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.';
  return 'Không thể đăng ký. Vui lòng thử lại.';
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;

  // Check if date is not in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj > today) return false;

  return true;
};

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDisplayDate = (date: string): string => {
  if (!isValidDate(date)) return date;
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const isValidFullName = (name: string): boolean => {
  // Allow only letters, spaces, and Vietnamese characters
  // Vietnamese characters: àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ
  // And uppercase versions
  const nameRegex = /^[a-zA-Z\u00C0-\u1EF9\s]+$/;
  return nameRegex.test(name);
};

export default function OptionalProfileScreen() {
  const { login } = useAuth();
  const { firebaseIdToken, password, profile, setProfile, reset } = useOtpRegistration();

  const [fullName, setFullName] = useState(profile.fullName || '');
  const [email, setEmail] = useState(profile.email || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || '');
  const [gender, setGender] = useState<Gender | ''>(profile.gender || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    if (profile.dateOfBirth && isValidDate(profile.dateOfBirth)) {
      return new Date(profile.dateOfBirth);
    }
    return new Date(2000, 0, 1);
  });

  // Real-time validation states
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [dateError, setDateError] = useState('');

  const isFullNameValid = useMemo(() => {
    return fullName.trim() !== '' && isValidFullName(fullName.trim());
  }, [fullName]);

  const isEmailValid = useMemo(() => {
    if (!email.trim()) return true; // Optional field
    return isValidEmail(email.trim());
  }, [email]);

  const isDateValid = useMemo(() => {
    if (!dateOfBirth.trim()) return true; // Empty is valid (optional field)
    return isValidDate(dateOfBirth.trim());
  }, [dateOfBirth]);

  const canRegister = useMemo(() => {
    return !!firebaseIdToken && !!password && !isSubmitting && isFullNameValid && isEmailValid && isDateValid;
  }, [firebaseIdToken, password, isSubmitting, isFullNameValid, isEmailValid, isDateValid]);

  const doRegister = async () => {
    if (!firebaseIdToken || !password) {
      Alert.alert('Phiên đăng ký đã hết', 'Vui lòng thực hiện lại từ đầu.');
      router.replace('/(auth)/register');
      return;
    }

    // Validate required fields
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên.');
      return;
    }
    if (!isValidFullName(fullName.trim())) {
      Alert.alert('Lỗi', 'Họ tên không được chứa ký tự đặc biệt.');
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const payload: Record<string, any> = {
        firebaseIdToken,
        password,
        fullName: fullName.trim(),
      };
      // Email is optional: only send when user actually entered one.
      if (trimmedEmail) {
        payload.email = trimmedEmail;
      }

      // Optional fields
      if (dateOfBirth.trim() && isValidDate(dateOfBirth.trim())) {
        payload.dateOfBirth = dateOfBirth.trim();
      }
      if (gender) {
        payload.gender = gender;
      }

      const resp = await authApi.register(payload);
      const persistedUserInfo = (resp as any)?.persistedUserInfo as UserInfo | undefined;
      const data = resp?.data?.data || resp?.data || {};
      const rawUser = data?.user || data?.profile || {};
      const rawTokens = data?.tokens || resp?.data?.tokens || {};

      const userInfo: UserInfo =
        persistedUserInfo ||
        ({
          phone: String(rawUser?.phone || '').trim(),
          name: rawUser?.fullName || rawUser?.name || fullName.trim() || '',
          email: rawUser?.email || trimmedEmail || '',
          avatarUrl: rawUser?.avatarUrl || rawUser?.avatar || '',
          bio: rawUser?.bio || '',
          dateOfBirth: rawUser?.dateOfBirth || dateOfBirth.trim() || '',
          gender: rawUser?.gender || (gender || ''),
          id: rawUser?.id || rawUser?._id || '',
          status: rawUser?.status || '',
          createdAt: rawUser?.createdAt || '',
          tokens: rawTokens?.accessToken
            ? {
                accessToken: String(rawTokens.accessToken),
                refreshToken: String(rawTokens.refreshToken || ''),
                expiresIn: Number(rawTokens.expiresIn || 0),
              }
            : undefined,
          loginTime: Date.now(),
        } as UserInfo);

      if (!userInfo.tokens?.accessToken) {
        throw new Error('Register response missing tokens');
      }

      setProfile({
        fullName: fullName.trim(),
        email: trimmedEmail,
        dateOfBirth: dateOfBirth.trim(),
        gender: (gender || undefined) as Gender | undefined,
      });

      await login(userInfo);
      reset();
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const status = e?.response?.status;

      if (status === 409) {
        Alert.alert(
          'Số điện thoại đã được đăng ký',
          'Số điện thoại này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng số điện thoại khác.',
          [
            {
              text: 'Đăng nhập',
              onPress: () => {
                reset();
                router.replace('/loginStep1');
              }
            },
            {
              text: 'Đăng ký lại',
              onPress: () => {
                reset();
                router.replace('/(auth)/register');
              }
            }
          ]
        );
      } else {
        Alert.alert('Đăng ký thất bại', friendlyRegisterError(e));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDatePicker = () => {
    if (dateOfBirth && isValidDate(dateOfBirth)) {
      setPickerDate(new Date(dateOfBirth));
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (!selectedDate) return;
    setPickerDate(selectedDate);
    setDateOfBirth(toDateInputValue(selectedDate));
    setDateError('');
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title}>Thông tin cá nhân</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={[styles.input, fullName.trim() && !isFullNameValid && styles.inputError]}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (text.trim() && !isValidFullName(text.trim())) {
                    setFullNameError('Họ tên không được chứa ký tự đặc biệt');
                  } else {
                    setFullNameError('');
                  }
                }}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#8e8e93"
              />
              {fullNameError && <Text style={styles.errorText}>{fullNameError}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, email.trim() && !isEmailValid && styles.inputError]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (text.trim() && !isValidEmail(text.trim())) {
                    setEmailError('Email không hợp lệ');
                  } else {
                    setEmailError('');
                  }
                }}
                placeholder="user@example.com"
                placeholderTextColor="#8e8e93"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ngày sinh</Text>
              <TouchableOpacity
                style={[styles.input, styles.datePickerTrigger, dateOfBirth.trim() && !isDateValid && styles.inputError]}
                onPress={openDatePicker}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                  {dateOfBirth ? toDisplayDate(dateOfBirth) : 'Chọn ngày sinh'}
                </Text>
              </TouchableOpacity>
              {dateError && <Text style={styles.errorText}>{dateError}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Nam</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Nữ</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !canRegister && styles.btnDisabled]}
              disabled={!canRegister}
              onPress={() => doRegister()}
            >
              <Text style={styles.btnText}>{isSubmitting ? 'Đang đăng ký...' : 'Hoàn tất đăng ký'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.dateModal}>
            <View style={styles.dateModalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateModalAction}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.dateModalTitle}>Chọn ngày sinh</Text>
              <TouchableOpacity
                onPress={() => {
                  setDateOfBirth(toDateInputValue(pickerDate));
                  setDateError('');
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.dateModalAction}>Xong</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
              maximumDate={new Date()}
              onChange={handleDateChange}
              style={styles.datePicker}
              themeVariant="dark"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  skipText: { color: '#0091ff', fontSize: 15, fontWeight: '700', paddingRight: 8 },
  content: { paddingHorizontal: 20, paddingTop: 10, flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#000',
  },
  datePickerTrigger: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  datePlaceholder: {
    color: '#8e8e93',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    marginTop: 4,
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: { borderColor: '#0091ff', backgroundColor: 'rgba(0,145,255,0.08)' },
  genderText: { fontSize: 16, color: '#000', fontWeight: '600' },
  genderTextActive: { color: '#0091ff' },
  primaryBtn: { backgroundColor: '#0091ff', paddingVertical: 14, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#99d1ff' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  dateModal: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  dateModalHeader: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dateModalAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0091ff',
  },
  datePicker: {
    backgroundColor: '#1c1c1e',
  },
});

