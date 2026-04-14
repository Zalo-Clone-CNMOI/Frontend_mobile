import { useOtpRegistration } from '@/src/contexts/OtpRegistrationContext';
import { router } from 'expo-router';
import { Check, ChevronLeft, Eye, EyeOff, XCircle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RequirementItem = ({ text, met }: { text: string; met: boolean }) => (
  <View style={styles.requirementItem}>
    <View style={[styles.checkIcon, met && styles.checkIconMet]}>
      {met && <Check size={14} color="#fff" />}
    </View>
    <Text style={[styles.requirementText, met && styles.requirementTextMet]}>{text}</Text>
  </View>
);

export default function CreatePasswordScreen() {
  const { firebaseIdToken, setPassword } = useOtpRegistration();
  const [password, setLocalPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const passwordRequirements = useMemo(() => {
    const p = password.trim();
    return {
      minLength: p.length >= 6,
      hasUpperCase: /[A-Z]/.test(p),
      hasLowerCase: /[a-z]/.test(p),
      hasNumber: /[0-9]/.test(p),
    };
  }, [password]);

  const isPasswordValid = useMemo(() => {
    return Object.values(passwordRequirements).every(Boolean);
  }, [passwordRequirements]);

  const isMatch = useMemo(() => {
    return password.trim() === confirm.trim() && password.trim() !== '';
  }, [password, confirm]);

  const canSubmit = useMemo(() => {
    return !!firebaseIdToken && isPasswordValid && isMatch;
  }, [firebaseIdToken, isPasswordValid, isMatch]);

  const handleNext = async () => {
    const p = password.trim();
    const c = confirm.trim();

    if (!firebaseIdToken) {
      Alert.alert('Phiên đăng ký đã hết', 'Vui lòng xác minh OTP lại.');
      router.replace('/(auth)/register');
      return;
    }

    if (!isPasswordValid) {
      Alert.alert('Mật khẩu không hợp lệ', 'Mật khẩu phải có tối thiểu 6 ký tự, 1 chữ hoa, 1 chữ thường và 1 chữ số.');
      return;
    }

    if (!isMatch) {
      Alert.alert('Không khớp', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setPassword(p);
    router.push('/(auth)/optionalProfile');
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
            <Text style={styles.title}>Tạo mật khẩu</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Mật khẩu"
                placeholderTextColor="#8e8e93"
                secureTextEntry={!isVisible}
                value={password}
                onChangeText={(text) => setLocalPassword(text.replace(/\s/g, ''))}
                autoFocus
              />
              <View style={styles.rightIcons}>
                <TouchableOpacity onPress={() => setIsVisible(!isVisible)} style={styles.iconButton}>
                  {isVisible ? <EyeOff size={22} color="#666" /> : <Eye size={22} color="#666" />}
                </TouchableOpacity>
                {password.length > 0 && (
                  <TouchableOpacity onPress={() => setLocalPassword('')} style={styles.iconButton}>
                    <XCircle size={20} color="#666" fill="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {password.length > 0 && (
              <View style={styles.requirementsContainer}>
                <RequirementItem
                  text="Tối thiểu 6 ký tự"
                  met={passwordRequirements.minLength}
                />
                <RequirementItem
                  text="Ít nhất 1 chữ hoa"
                  met={passwordRequirements.hasUpperCase}
                />
                <RequirementItem
                  text="Ít nhất 1 chữ thường"
                  met={passwordRequirements.hasLowerCase}
                />
                <RequirementItem
                  text="Ít nhất 1 chữ số"
                  met={passwordRequirements.hasNumber}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#8e8e93"
                secureTextEntry={!isVisible}
                value={confirm}
                onChangeText={(text) => setConfirm(text.replace(/\s/g, ''))}
              />
              {confirm.length > 0 && (
                <>
                  {isMatch ? (
                    <Check size={22} color="#0091ff" style={styles.iconButton} />
                  ) : (
                    <TouchableOpacity onPress={() => setConfirm('')} style={styles.iconButton}>
                      <XCircle size={20} color="#666" fill="#ccc" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {confirm.length > 0 && !isMatch && (
              <Text style={styles.errorText}>Mật khẩu xác nhận không khớp</Text>
            )}

            <TouchableOpacity style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={handleNext}>
              <Text style={styles.btnText}>Tiếp tục</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 40 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: '#0091ff',
    height: 50,
    marginBottom: 24,
  },
  textInput: { flex: 1, fontSize: 18, color: '#000', paddingVertical: 8 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { padding: 4 },
  requirementsContainer: { marginBottom: 24, gap: 8 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconMet: {
    backgroundColor: '#0091ff',
    borderColor: '#0091ff',
  },
  requirementText: { fontSize: 14, color: '#666' },
  requirementTextMet: { color: '#0091ff' },
  errorText: { color: '#ff3b30', fontSize: 13, marginTop: -12, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#0091ff', paddingVertical: 14, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#99d1ff' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});

