import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import API_URL from '../../config/api';

interface LoginScreenProps {
  onLogin: (isAuthenticated: boolean) => void;
  onNavigateToRegister: () => void;
  onBackToHome?: () => void;
  showBackButton?: boolean;
}

export default function LoginScreen({ onLogin, onNavigateToRegister, onBackToHome, showBackButton = false }: LoginScreenProps) {
  const [formData, setFormData] = useState({
    phoneOrEmail: '',
    password: '',
    rememberPassword: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.phoneOrEmail || !formData.password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Đóng bàn phím và bắt đầu loading
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.phoneOrEmail,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful
        setIsLoading(false);
        onLogin(true);
      } else {
        // Login failed - handle specific error messages
        let errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
        
        if (data.message) {
          const message = data.message.toLowerCase();
          if (message.includes('invalid credentials')) {
            errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
          } else if (message.includes('validation failed')) {
            errorMessage = 'Thông tin đăng nhập không hợp lệ';
          } else if (message.includes('user not found')) {
            errorMessage = 'Tài khoản không tồn tại';
          } else if (message.includes('account locked') || message.includes('account disabled')) {
            errorMessage = 'Tài khoản đã bị khóa';
          } else {
            errorMessage = data.message;
          }
        }
        
        setIsLoading(false);
        Alert.alert('Lỗi đăng nhập', errorMessage);
      }
    } catch (error) {
      // Network or other error
      setIsLoading(false);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.');
      console.error('Login error:', error);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Quên mật khẩu', 'Tính năng này sẽ được phát triển trong tương lai');
  };

  const handleSocialLogin = (platform: string) => {
    Alert.alert(`Đăng nhập ${platform}`, 'Tính năng này sẽ được phát triển trong tương lai');
  };

  const navigateToRegister = () => {
    onNavigateToRegister();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {showBackButton && (
            <TouchableOpacity style={styles.backButton} onPress={onBackToHome}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, showBackButton && styles.headerTitleWithBack]}>Đăng nhập</Text>
          {showBackButton && <View style={styles.placeholder} />}
        </View>

        <View style={styles.content}>
        {/* Phone/Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={formData.phoneOrEmail}
            onChangeText={(text) => updateFormData('phoneOrEmail', text)}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
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

        {/* Forgot Password */}
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity 
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loginButtonContent}>
              <ActivityIndicator size="small" color="#000" style={styles.spinner} />
              <Text style={styles.loginButtonText}>Đang đăng nhập...</Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        {/* Or Divider */}
        <Text style={styles.orText}>Hoặc đăng nhập bằng</Text>

        {/* Social Login */}
        <View style={styles.socialContainer}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Facebook')}
          >
            <Ionicons name="logo-facebook" size={24} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Google')}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Apple')}
          >
            <Ionicons name="logo-apple" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Zalo')}
          >
            <View style={styles.zaloIcon}>
              <Text style={styles.zaloText}>Z</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={navigateToRegister}>
            <Text style={styles.registerLink}>Đăng ký tài khoản mới</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <View style={styles.footerRow}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Quy chế hoạt động sàn</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Chính sách bảo mật</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.footerRow}>
          <View style={styles.footerRow}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Liên hệ hỗ trợ</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Điều khoản sử dụng</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>

        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 80,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 4,
    paddingBottom: 50
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    paddingLeft: 50,
  },
  headerTitleWithBack: {
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
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
  forgotPassword: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'right',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  loginButtonText: {
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
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#007AFF',
  },
  footerLinks: {
    paddingTop: 100,
    alignItems: 'center',
    marginBottom: 20,
  },
  footerRow: {

    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 12,
    color: '#999',
  },
});
