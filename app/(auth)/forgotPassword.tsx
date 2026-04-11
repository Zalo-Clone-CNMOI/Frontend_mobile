import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { router } from 'expo-router';
import { Check, ChevronLeft, Eye, EyeOff, XCircle } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmOtp, getFirebaseIdToken, sendOtp, setRecaptchaVerifier } from "../../src/services/auth/firebaseAuth.service";
import * as authApi from '../../src/services/authApi';
import { FIREBASE_CONFIG, getFirebaseApp } from "../../src/services/firebase";
import {
    ActivityIndicator,
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

type Step = 'phone' | 'otp' | 'password' | 'success';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('phone');
  
  const [phone, setPhone] = useState('');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef<(TextInput | null)[]>([]);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  getFirebaseApp();
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState('');

  const isValidPhone = (phoneNum: string) => {
    const cleaned = phoneNum.replace(/\s/g, '');
    return /^0[3|5|7|8|9][0-9]{8}$/.test(cleaned) || /^\+84[3|5|7|8|9][0-9]{8}$/.test(cleaned);
  };

  const handleSendOTP = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert(t('common.error'), t('forgot_password.invalid_phone'));
      return;
    }

    setIsLoading(true);
    try {
      const phoneStr = phone.trim();
      let phoneE164 = phoneStr;
      if (phoneStr.startsWith('0')) {
        phoneE164 = '+84' + phoneStr.slice(1);
      } else if (!phoneStr.startsWith('+')) {
        phoneE164 = '+84' + phoneStr;
      }
      
      setRecaptchaVerifier((recaptchaVerifier.current as any) || null);
      await sendOtp(phoneE164);
      setCurrentStep('otp');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.message || 'Vui lòng thử lại.';
      const displayMsg = Array.isArray(errorMsg) ? errorMsg.join('\n') : String(errorMsg);
      Alert.alert('Không thể gửi OTP', displayMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert(t('common.error'), t('forgot_password.invalid_otp'));
      return;
    }

    setIsLoading(true);
    try {
      await confirmOtp(otpCode);
      const token = await getFirebaseIdToken();
      setFirebaseIdToken(token);
      setCurrentStep('password');
    } catch (e: any) {
      Alert.alert('Xác thực thất bại', 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('forgot_password.password_too_short'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('forgot_password.password_mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ firebaseIdToken, newPassword });
      setCurrentStep('success');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.message || 'Vui lòng thử lại sau.';
      const displayMsg = Array.isArray(errorMsg) ? errorMsg.join('\n') : String(errorMsg);
      Alert.alert('Đổi mật khẩu thất bại', displayMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const renderPhoneStep = () => (
    <>
      <Text style={styles.subTitle}>{t('forgot_password.enter_phone')}</Text>
      <Text style={styles.description}>{t('forgot_password.phone_description')}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={t('auth.phone')}
          placeholderTextColor="#8e8e93"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/\s/g, ''))}
          autoFocus={true}
          maxLength={15}
        />
        {phone.length > 0 && (
          <TouchableOpacity onPress={() => setPhone('')} style={styles.clearButton}>
            <XCircle size={20} color="#666" fill="#e5e5e5" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !isValidPhone(phone) && styles.btnDisabled]}
        disabled={!isValidPhone(phone) || isLoading}
        onPress={handleSendOTP}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t('forgot_password.send_otp')}</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderOtpStep = () => (
    <>
      <Text style={styles.subTitle}>{t('forgot_password.enter_otp')}</Text>
      <Text style={styles.description}>
        {t('forgot_password.otp_sent_to')} {phone}
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { otpInputs.current[index] = ref; }}
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(value) => handleOtpChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
            autoFocus={index === 0}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity style={styles.resendButton} onPress={handleSendOTP} disabled={isLoading}>
        <Text style={styles.resendText}>{t('forgot_password.resend_otp')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, otp.join('').length !== 6 && styles.btnDisabled]}
        disabled={otp.join('').length !== 6 || isLoading}
        onPress={handleVerifyOTP}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t('forgot_password.verify')}</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={styles.subTitle}>{t('forgot_password.enter_new_password')}</Text>
      <Text style={styles.description}>{t('forgot_password.password_description')}</Text>

      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={t('forgot_password.new_password')}
          placeholderTextColor="#8e8e93"
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onChangeText={setNewPassword}
          autoFocus={true}
        />
        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
            {showNewPassword ? <EyeOff size={22} color="#666" /> : <Eye size={22} color="#666" />}
          </TouchableOpacity>
          {newPassword.length > 0 && (
            <TouchableOpacity onPress={() => setNewPassword('')}>
              <XCircle size={20} color="#666" fill="#e5e5e5" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      
      <View style={[styles.inputContainer, { marginTop: 20 }]}>
        <TextInput
          style={styles.textInput}
          placeholder={t('forgot_password.confirm_password')}
          placeholderTextColor="#8e8e93"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? <EyeOff size={22} color="#666" /> : <Eye size={22} color="#666" />}
          </TouchableOpacity>
          {confirmPassword.length > 0 && (
            <TouchableOpacity onPress={() => setConfirmPassword('')}>
              <XCircle size={20} color="#666" fill="#e5e5e5" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          (newPassword.length < 6 || newPassword !== confirmPassword) && styles.btnDisabled,
          { marginTop: 40 },
        ]}
        disabled={newPassword.length < 6 || newPassword !== confirmPassword || isLoading}
        onPress={handleResetPassword}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t('forgot_password.reset_password')}</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Check size={40} color="#fff" strokeWidth={3} />
      </View>
      <Text style={styles.successTitle}>{t('forgot_password.success_title')}</Text>
      <Text style={styles.successDescription}>{t('forgot_password.success_description')}</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(auth)/loginStep1')}>
        <Text style={styles.btnText}>{t('forgot_password.back_to_login')}</Text>
      </TouchableOpacity>
    </View>
  );

  const getTitle = () => {
    switch (currentStep) {
      case 'phone':
        return t('forgot_password.title');
      case 'otp':
        return t('forgot_password.verify_code');
      case 'password':
        return t('forgot_password.create_password');
      case 'success':
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={FIREBASE_CONFIG as any}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>
          {currentStep !== 'success' && <Text style={styles.headerTitle}>{getTitle()}</Text>}
          <View style={styles.placeholder} />
        </View>

        
        {currentStep !== 'success' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, styles.progressStepActive]} />
            <View
              style={[styles.progressStep, currentStep !== 'phone' && styles.progressStepActive]}
            />
            <View
              style={[styles.progressStep, currentStep === 'password' && styles.progressStepActive]}
            />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 'phone' && renderPhoneStep()}
          {currentStep === 'otp' && renderOtpStep()}
          {currentStep === 'password' && renderPasswordStep()}
          {currentStep === 'success' && renderSuccessStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
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
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressStep: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e5e5',
  },
  progressStepActive: {
    backgroundColor: '#0091ff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  subTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: '#0091ff',
    height: 50,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    color: '#000',
    paddingVertical: 8,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    padding: 4,
  },
  primaryBtn: {
    backgroundColor: '#0091ff',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 32,
    height: 50,
  },
  btnDisabled: {
    backgroundColor: '#99d1ff',
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
    backgroundColor: '#f8f8f8',
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 15,
    color: '#0091ff',
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00c853',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
});
