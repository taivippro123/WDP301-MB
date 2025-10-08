import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import API_URL from '../../config/api';

interface RegisterScreenProps {
  onRegister: () => void;
  onBackToLogin: () => void;
}

export default function RegisterScreen({ onRegister, onBackToLogin }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Password validation functions
  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8 && password.length <= 32,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    };
  };

  const passwordValidation = validatePassword(formData.password);

  const handleRegister = async () => {
    if (!formData.fullName || !formData.phone || !formData.email || !formData.password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (!formData.agreeTerms) {
      Alert.alert('Lỗi', 'Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }

    // Validate password requirements
    const validation = validatePassword(formData.password);
    if (!validation.length || !validation.uppercase || !validation.lowercase || !validation.number) {
      Alert.alert('Lỗi', 'Mật khẩu không đáp ứng đủ yêu cầu');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: 'user',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful
        Alert.alert('Thành công', 'Đăng ký tài khoản thành công!', [
          { text: 'OK', onPress: onRegister }
        ]);
      } else {
        // Registration failed - handle specific error messages
        let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';
        
        if (data.message) {
          const message = data.message.toLowerCase();
          if (message.includes('validation failed')) {
            errorMessage = 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.';
          } else if (message.includes('email already exists') || message.includes('email already taken')) {
            errorMessage = 'Email này đã được sử dụng. Vui lòng chọn email khác.';
          } else if (message.includes('phone already exists') || message.includes('phone already taken')) {
            errorMessage = 'Số điện thoại này đã được sử dụng. Vui lòng chọn số khác.';
          } else if (message.includes('invalid email')) {
            errorMessage = 'Định dạng email không hợp lệ.';
          } else if (message.includes('password too weak') || message.includes('weak password')) {
            errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
          } else if (message.includes('invalid phone')) {
            errorMessage = 'Số điện thoại không hợp lệ.';
          } else {
            errorMessage = data.message;
          }
        }
        
        Alert.alert('Lỗi đăng ký', errorMessage);
      }
    } catch (error) {
      // Network or other error
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
      console.error('Register error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Form */}
        <View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Họ và tên <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Họ và tên"
              placeholderTextColor="#999"
              value={formData.fullName}
              onChangeText={(text) => updateFormData('fullName', text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Số điện thoại <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor="#999"
              value={formData.phone}
              onChangeText={(text) => updateFormData('phone', text)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mật khẩu <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mật khẩu"
                placeholderTextColor="#999"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Xác nhận mật khẩu <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor="#999"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <View style={styles.requirement}>
              <View style={[styles.checkIcon, passwordValidation.length && styles.validCheckIcon]}>
                {passwordValidation.length && <Ionicons name="checkmark" size={12} color="#4CAF50" />}
              </View>
              <Text style={styles.requirementText}>Giới hạn từ 8-32 ký tự.</Text>
            </View>
            <View style={styles.requirement}>
              <View style={[styles.checkIcon, passwordValidation.uppercase && styles.validCheckIcon]}>
                {passwordValidation.uppercase && <Ionicons name="checkmark" size={12} color="#4CAF50" />}
              </View>
              <Text style={styles.requirementText}>Tối thiểu 01 ký tự IN HOA.</Text>
            </View>
            <View style={styles.requirement}>
              <View style={[styles.checkIcon, passwordValidation.lowercase && styles.validCheckIcon]}>
                {passwordValidation.lowercase && <Ionicons name="checkmark" size={12} color="#4CAF50" />}
              </View>
              <Text style={styles.requirementText}>Tối thiểu 01 ký tự in thường.</Text>
            </View>
            <View style={styles.requirement}>
              <View style={[styles.checkIcon, passwordValidation.number && styles.validCheckIcon]}>
                {passwordValidation.number && <Ionicons name="checkmark" size={12} color="#4CAF50" />}
              </View>
              <Text style={styles.requirementText}>Tối thiểu 01 chữ số.</Text>
            </View>
          </View>
         

          {/* Terms Agreement */}
          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={[styles.checkbox, formData.agreeTerms && styles.checkedBox]}
              onPress={() => updateFormData('agreeTerms', !formData.agreeTerms)}
            >
              {formData.agreeTerms && <Ionicons name="checkmark" size={16} color="#007AFF" />}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              Tôi đồng ý với{' '}
              <Text style={styles.termsLink}>Điều khoản sử dụng</Text>
              {' '}và{' '}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text>
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Đăng ký</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={onBackToLogin}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView  >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  mascotContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  mascot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotText: {
    fontSize: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  eyeButton: {
    padding: 12,
  },
  requirementsContainer: {
    marginBottom: 24,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  validCheckIcon: {
    backgroundColor: '#E8F5E8',
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkedBox: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  orText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#007AFF',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  zaloIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zaloText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});
