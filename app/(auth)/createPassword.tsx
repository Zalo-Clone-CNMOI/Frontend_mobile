import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, XCircle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOtpRegistration } from '@/src/contexts/OtpRegistrationContext';

export default function CreatePasswordScreen() {
  const { firebaseIdToken, setPassword } = useOtpRegistration();
  const [password, setLocalPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const canSubmit = useMemo(() => {
    const p = password.trim();
    return !!firebaseIdToken && p.length >= 6 && p === confirm.trim();
  }, [password, confirm, firebaseIdToken]);

  const handleNext = async () => {
    const p = password.trim();
    const c = confirm.trim();

    if (!firebaseIdToken) {
      Alert.alert('Phiên đăng ký đã hết', 'Vui lòng xác minh OTP lại.');
      router.replace('/(auth)/register');
      return;
    }

    if (p.length < 6) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }
    if (p !== c) {
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
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
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
                <TouchableOpacity onPress={() => setConfirm('')} style={styles.iconButton}>
                  <XCircle size={20} color="#666" fill="#ccc" />
                </TouchableOpacity>
              )}
            </View>

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
  primaryBtn: { backgroundColor: '#0091ff', paddingVertical: 14, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#99d1ff' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});

