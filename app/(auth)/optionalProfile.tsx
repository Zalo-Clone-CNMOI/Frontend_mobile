import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useOtpRegistration, type Gender } from '@/src/contexts/OtpRegistrationContext';
import * as authApi from '@/src/services/authApi';
import type { UserInfo } from '@/src/services/authService';

const friendlyRegisterError = (err: any): string => {
  const status = err?.response?.status;
  const message = String(err?.response?.data?.message || err?.message || '');

  if (status === 409) return 'Số điện thoại đã tồn tại. Vui lòng đăng nhập.';
  if (status === 400) return 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.';
  if (message.toLowerCase().includes('network')) return 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.';
  return 'Không thể đăng ký. Vui lòng thử lại.';
};

export default function OptionalProfileScreen() {
  const { login } = useAuth();
  const { firebaseIdToken, password, profile, setProfile, reset } = useOtpRegistration();

  const [fullName, setFullName] = useState(profile.fullName || '');
  const [email, setEmail] = useState(profile.email || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || '');
  const [gender, setGender] = useState<Gender | ''>(profile.gender || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRegister = useMemo(() => !!firebaseIdToken && !!password && !isSubmitting, [firebaseIdToken, password, isSubmitting]);

  const doRegister = async (skipProfile: boolean) => {
    if (!firebaseIdToken || !password) {
      Alert.alert('Phiên đăng ký đã hết', 'Vui lòng thực hiện lại từ đầu.');
      router.replace('/(auth)/register');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        firebaseIdToken,
        password,
        fullName: skipProfile ? '' : fullName.trim(),
        email: skipProfile ? '' : email.trim(),
        dateOfBirth: skipProfile ? '' : dateOfBirth.trim(),
        gender: skipProfile ? undefined : (gender || undefined),
      };

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
          email: rawUser?.email || email.trim() || '',
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
        email: email.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender: (gender || undefined) as Gender | undefined,
      });

      await login(userInfo);
      reset();
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Đăng ký thất bại', friendlyRegisterError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity disabled={!canRegister} onPress={() => doRegister(true)}>
            <Text style={[styles.skipText, !canRegister && { opacity: 0.5 }]}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title}>Thông tin cá nhân (tuỳ chọn)</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Nguyễn Văn A" placeholderTextColor="#8e8e93" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor="#8e8e93"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ngày sinh</Text>
              <TextInput
                style={styles.input}
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
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8e8e93"
                keyboardType="numeric"
                maxLength={10}
              />
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
              onPress={() => doRegister(false)}
            >
              <Text style={styles.btnText}>{isSubmitting ? 'Đang đăng ký...' : 'Hoàn tất đăng ký'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
});

