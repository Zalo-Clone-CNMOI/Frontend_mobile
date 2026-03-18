import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, XCircle } from 'lucide-react-native';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import * as authApi from '../../src/services/authApi';

// Interface cho user info
interface UserInfo {
  phone: string;
  password?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  id?: string;
  status?: string;
  createdAt?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  loginTime?: number;
}

export default function LoginStep2() {
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // Trạng thái hiện/ẩn mật khẩu
  const [isLoading, setIsLoading] = useState(false);
  const { phone } = useLocalSearchParams();
  const { t } = useTranslation();
  const { login } = useAuth(); // Use login function from AuthContext

  const handlePasswordChange = (text: string) => {
    // Regex: Loại bỏ khoảng trắng (mật khẩu không nên có khoảng trắng)
    const cleaned = text.replace(/\s/g, '');
    setPassword(cleaned);
  };

  // Xử lý đăng nhập và lưu phiên
  const handleLogin = async () => {
    if (password.length === 0) return;
    
    setIsLoading(true);
    try {
      const resp = await authApi.login({ phone: phone as string, password });
      const data = resp?.data || {};

      if (resp.status < 200 || resp.status >= 300) {
        throw new Error(data.message || 'Login failed');
      }

      const userObj = data?.data || {};
      const userInfo: UserInfo = {
        phone: phone as string,
        password: password,
        name: userObj?.user?.fullName || 'User ' + phone,
        email: userObj?.user?.email || '',
        avatarUrl: userObj?.user?.avatarUrl || '',
        bio: userObj?.user?.bio || '',
        dateOfBirth: userObj?.user?.dateOfBirth || '',
        gender: userObj?.user?.gender || '',
        id: userObj?.user?.id || '',
        status: userObj?.user?.status || '',
        createdAt: userObj?.user?.createdAt || '',
        tokens: userObj?.tokens || undefined,
        loginTime: Date.now()
      };

      await login(userInfo);
      console.log('Login successful, user data saved');
      console.log('userInfo >>>>>', userInfo);
      router.push('/(tabs)/home');
    } catch (error: any) {
      console.error('Login failed:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.haederTitle}>{t('loginstep2.enter_password')}</Text>
            <Text style={styles.title}>{phone}</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={t('auth.password')}
                placeholderTextColor="#8e8e93"
                secureTextEntry={!isPasswordVisible} // Ẩn/hiện mật khẩu
                value={password}
                onChangeText={handlePasswordChange}
                autoFocus={true}
              />

              <View style={styles.rightIcons}>
                {/* Nút ẩn/hiện mật khẩu */}
                <TouchableOpacity 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.iconButton}
                >
                  {isPasswordVisible ? <EyeOff size={22} color="#666" /> : <Eye size={22} color="#666" />}
                </TouchableOpacity>

                {/* Nút xóa nhanh */}
                {password.length > 0 && (
                  <TouchableOpacity onPress={() => setPassword('')} style={styles.iconButton}>
                    <XCircle size={20} color="#666" fill="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, password.length === 0 && styles.btnDisabled]}
              disabled={password.length === 0 || isLoading}
              onPress={handleLogin}
              // onPress={()=>router.push('/(tabs)/home')}
            >
              <Text style={styles.btnText}>
                {isLoading ? t('common.loading') : t('auth.login')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity>
            <Text style={styles.linkText}>{t('auth.forgot_password')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 8 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 30, flex: 1 },
  haederTitle: { 
    fontSize: 15, 
    fontWeight: '400', 
    textAlign: 'center', 
    color: '#666',
    marginBottom: 10 
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#000', 
    textAlign: 'center', 
    marginBottom: 40 
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5, // Dùng gạch chân giống Zalo Step 2
    borderColor: '#0091ff',
    height: 50,
    marginBottom: 40,
  },
  textInput: { 
    flex: 1, 
    fontSize: 18, 
    color: '#000',
    paddingVertical: 8
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconButton: {
    padding: 4
  },
  primaryBtn: { 
    backgroundColor: '#0091ff', 
    paddingVertical: 14, 
    borderRadius: 30, 
    alignItems: 'center' 
  },
  btnDisabled: { 
    backgroundColor: '#99d1ff' 
  },
  btnText: { 
    color: '#fff', 
    fontSize: 17, 
    fontWeight: '600' 
  },
  footer: { 
    paddingBottom: 20, 
    alignItems: 'center' 
  },
  linkText: { 
    fontSize: 15, 
    color: '#0091ff', 
    fontWeight: '700' 
  },
});