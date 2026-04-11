import { useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COUNTRIES_MOCK_DATA } from '../../src/data/countriesMockData';
import { validatePhoneByCountry } from '../../src/validators/phoneValidator';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES_MOCK_DATA[0]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPhoneError, setIsPhoneError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const {t} = useTranslation();

  const handleInputChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);

    if (cleaned.length === 0) {
      setIsPhoneError(false);
      setErrorMessage('');
      return;
    }

    const isValid = validatePhoneByCountry(cleaned, selectedCountry.code);
    setIsPhoneError(!isValid);
    setErrorMessage(isValid ? '' : 'Số điện thoại không hợp lệ. Kiểm tra và thử lại.');
  }; 

  const selectCountry = (country: any) => {
    setSelectedCountry(country);
    setIsModalVisible(false);

    if (phoneNumber.length > 0) {
      const isValid = validatePhoneByCountry(phoneNumber, country.code);
      setIsPhoneError(!isValid);
      setErrorMessage(isValid ? '' : 'Số điện thoại không hợp lệ. Kiểm tra và thử lại.');
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
            <Text style={styles.title}>{t('loginstep1.enter_phone')}</Text>

            <View style={[styles.inputContainer, isPhoneError && styles.inputError]}>
              
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                <ChevronDown size={16} color="#0091ff" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TextInput
                style={styles.textInput}
                placeholder={t('loginstep1.phone_placeholder')}
                placeholderTextColor="#8e8e93"
                keyboardType="numeric"
                value={phoneNumber}
                onChangeText={handleInputChange}
                autoFocus={true}
                maxLength={11}
              />

              {phoneNumber.length > 0 && (
                <TouchableOpacity onPress={() => setPhoneNumber('')} style={styles.clearBtn}>
                  <XCircle size={20} color="#666" fill="#ccc" />
                </TouchableOpacity>
              )}
            </View>

            {isPhoneError && (
              <Text style={styles.errorText}>{errorMessage || 'Số điện thoại không hợp lệ. Kiểm tra và thử lại.'}</Text>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, phoneNumber.length < 9 && styles.btnDisabled]}
              disabled={phoneNumber.length < 9}
              onPress={() => {
                if (!validatePhoneByCountry(phoneNumber, selectedCountry.code)) {
                  setIsPhoneError(true);
                  setErrorMessage('Số điện thoại không hợp lệ. Kiểm tra và thử lại.');
                  return;
                }

                router.push({
                  pathname: '/(auth)/loginStep2',
                  params: {
                    phone: phoneNumber,
                  }
                });
              }}
            >
              <Text style={styles.btnText} >{t('common.next')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('loginstep1.no_account')} </Text>
          <TouchableOpacity onPress={()=>{router.push('/(auth)/register')}}>
            <Text style={styles.linkText}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      
      <Modal visible={isModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <ChevronLeft size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('loginstep1.select_country')}</Text>
            <View style={{ width: 28 }} />
          </View>

          <FlatList
            data={COUNTRIES_MOCK_DATA}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryItem}
                onPress={() => selectCountry(item)}
              >
                <View style={styles.countryItemLeft}>
                  <Text style={styles.countryName}>{item.name}</Text>
                </View>
                <Text style={styles.dialCodeText}>{item.code}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.itemDivider} />}
          />
        </SafeAreaView>
      </Modal>
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
    borderWidth: 1.5,
    borderColor: '#0091ff', //
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 15,
    marginBottom: 35,
  },
  countrySelector: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 12 },
  countryCode: { fontSize: 18, color: '#000', fontWeight: '500' },
  divider: { width: 1, height: '50%', backgroundColor: '#e5e5ea', marginRight: 15 }, //
  textInput: { flex: 1, fontSize: 18, color: '#000' },
  clearBtn: { paddingLeft: 10 },
  inputError: { borderColor: '#ff3b30' },
  errorText: { color: '#ff3b30', marginBottom: 12, marginTop: -8 },
  primaryBtn: { backgroundColor: '#0091ff', paddingVertical: 14, borderRadius: 30, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#99d1ff' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  footer: { paddingBottom: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#666' },
  linkText: { fontSize: 14, color: '#0091ff', fontWeight: '700' },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  countryItemLeft: { flexDirection: 'row', alignItems: 'center' },
  countryName: { fontSize: 16, color: '#000' },
  dialCodeText: { fontSize: 16, color: '#8e8e93' },
  itemDivider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 16 }
});