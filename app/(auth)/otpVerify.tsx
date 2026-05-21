import { useOtpRegistration } from '@/src/contexts/OtpRegistrationContext';
import { confirmOtp, getFirebaseIdToken, sendOtp, setRecaptchaVerifier } from '@/src/services/auth/firebaseAuth.service';
import { getFirebaseApp } from '@/src/services/firebase';
import * as authApi from '@/src/services/authApi';
import { router } from 'expo-router';
import { ChevronLeft, XCircle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const mapFirebaseOtpError = (err: any): string => {
  const code = String(err?.code || '');
  const message = String(err?.message || '');

  if (code.includes('auth/invalid-verification-code')) return 'Mã OTP không đúng. Vui lòng thử lại.';
  if (code.includes('auth/code-expired')) return 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.';
  if (code.includes('auth/too-many-requests')) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.';
  if (message.toLowerCase().includes('network')) return 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.';

  return 'Không thể xác minh OTP. Vui lòng thử lại.';
};

export default function OtpVerifyScreen() {
  getFirebaseApp();

  const { phoneE164, setConfirmationResult, setFirebaseIdToken, reset } = useOtpRegistration();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const recaptchaVerifier = React.useRef(null);

  const canSubmit = useMemo(() => code.trim().length >= 6 && !!phoneE164, [code, phoneE164]);

  const handleVerify = async () => {
    if (!canSubmit || isVerifying) return;
    setIsVerifying(true);
    try {
      await confirmOtp(code.trim());
      const token = await getFirebaseIdToken();

      const isExistingAccount = await authApi.checkPhoneExists(phoneE164);
      if (isExistingAccount) {
        Alert.alert(
          'Số điện thoại đã được đăng ký',
          'SĐT này đã được đăng ký. Bạn muốn chuyển sang đăng nhập hay quay lại để đăng ký SĐT mới?',
          [
            {
              text: 'Đăng ký số mới',
              style: 'cancel',
              onPress: () => {
                reset();
                router.replace('/(auth)/register');
              },
            },
            {
              text: 'Đăng nhập',
              onPress: () => {
                reset();
                router.replace('/(auth)/loginStep1');
              },
            },
          ],
        );
        return;
      }

      setFirebaseIdToken(token);
      router.push('/(auth)/createPassword');
    } catch (e: any) {
      Alert.alert('Xác minh thất bại', mapFirebaseOtpError(e));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!phoneE164 || isResending) return;
    setIsResending(true);
    try {
      setRecaptchaVerifier((recaptchaVerifier.current as any) || null);
      const confirmation = await sendOtp(phoneE164);
      setConfirmationResult(confirmation);
      Alert.alert('Thành công', 'Mã OTP mới đã được gửi.');
    } catch (e: any) {
      Alert.alert('Không thể gửi lại', mapFirebaseOtpError(e));
    } finally {
      setIsResending(false);
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
            <Text style={styles.haederTitle}>Nhập mã OTP</Text>
            <Text style={styles.title}>{phoneE164}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập 6 chữ số"
                placeholderTextColor="#8e8e93"
                keyboardType="numeric"
                value={code}
                onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                autoFocus
                maxLength={6}
              />
              {code.length > 0 && (
                <TouchableOpacity onPress={() => setCode('')} style={styles.iconButton}>
                  <XCircle size={20} color="#666" fill="#ccc" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!canSubmit || isVerifying) && styles.btnDisabled]}
              disabled={!canSubmit || isVerifying}
              onPress={handleVerify}
            >
              <Text style={styles.btnText}>{isVerifying ? 'Đang xác minh...' : 'Xác minh'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} disabled={isResending} onPress={handleResend}>
              {isResending ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color="#0091ff" />
                  <Text style={styles.secondaryText}>Đang gửi lại...</Text>
                </View>
              ) : (
                <Text style={styles.secondaryText}>Gửi lại mã</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 8 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 30, flex: 1 },
  haederTitle: { fontSize: 15, fontWeight: '400', textAlign: 'center', color: '#666', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 40 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: '#0091ff',
    height: 50,
    marginBottom: 30,
  },
  textInput: { flex: 1, fontSize: 18, color: '#000', paddingVertical: 8, letterSpacing: 8 },
  iconButton: { padding: 4 },
  primaryBtn: { backgroundColor: '#0091ff', paddingVertical: 14, borderRadius: 30, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#99d1ff' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  secondaryText: { color: '#0091ff', fontSize: 15, fontWeight: '700' },
});

