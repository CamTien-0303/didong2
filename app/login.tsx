import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { loginUser, loginWithGoogle } from '../services/authService';
import { FACEBOOK_OAUTH_CONFIG, GOOGLE_OAUTH_CONFIG } from '../services/GoogleAuthConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Google OAuth Setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
    iosClientId: GOOGLE_OAUTH_CONFIG.iosClientId,
    androidClientId: GOOGLE_OAUTH_CONFIG.androidClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleLoginSuccess(authentication.idToken);
    }
  }, [response]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ Email và Mật khẩu');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginUser(trimmedEmail, trimmedPassword);

      if (result.success) {
        Alert.alert('Thành công', 'Đăng nhập thành công!');
        router.replace('/(tabs)');
      } else {
        let errorMessage = "Đăng nhập thất bại.";

        if (result.message.includes('invalid-credential') || result.message.includes('wrong-password') || result.message.includes('user-not-found')) {
          errorMessage = "Email hoặc mật khẩu không chính xác.";
        } else if (result.message.includes('invalid-email')) {
          errorMessage = "Email không hợp lệ.";
        } else if (result.message.includes('too-many-requests')) {
          errorMessage = "Quá nhiều lần thử sai. Vui lòng thử lại sau.";
        } else {
          errorMessage = result.message;
        }

        Alert.alert('Thất bại', errorMessage);
      }

    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Lỗi kết nối hệ thống. Vui lòng kiểm tra mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (idToken) => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle(idToken);
      if (result.success) {
        Alert.alert('Thành công', 'Đăng nhập Google thành công!');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Lỗi', result.message || 'Đăng nhập Google thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đăng nhập Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Check if config is set
      if (GOOGLE_OAUTH_CONFIG.webClientId.includes('YOUR_')) {
        Alert.alert(
          'Chưa cấu hình',
          'Vui lòng cấu hình Google OAuth Client ID trong file GoogleAuthConfig.js\n\nHướng dẫn:\n1. Vào Firebase Console\n2. Authentication -> Sign-in method -> Google\n3. Copy Web SDK configuration'
        );
        return;
      }

      await promptAsync();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở Google Sign In');
    }
  };

  const handleFacebookLogin = () => {
    // Check if config is set
    if (FACEBOOK_OAUTH_CONFIG.appId.includes('YOUR_')) {
      Alert.alert(
        'Chưa cấu hình',
        'Vui lòng cấu hình Facebook App ID trong file GoogleAuthConfig.js\n\nHướng dẫn:\n1. Vào developers.facebook.com\n2. Tạo Facebook App\n3. Copy App ID'
      );
      return;
    }

    Alert.alert('Thông báo', 'Tính năng đăng nhập Facebook đang được phát triển.\n\nĐể hoàn thành, cần:\n1. Cấu hình Facebook App\n2. Thêm Facebook SDK');
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.logoContainer}>
          <Text style={styles.welcomeText}>Chào mừng tới với</Text>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.formContainer}>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập địa chỉ email"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ?
                  <EyeOff color="#A0A0A0" size={20} /> :
                  <Eye color="#A0A0A0" size={20} />
                }
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleLogin}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={styles.socialIcon}
            />
            <Text style={styles.socialButtonText}>Tiếp tục với Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleFacebookLogin}
          >
            <Text style={styles.facebookIcon}>f</Text>
            <Text style={styles.socialButtonText}>Tiếp tục với Facebook</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Bạn chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.signupLink}>Đăng ký</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40
  },

  logoContainer: {
    alignItems: 'center'
  },
  welcomeText: {
    fontSize: 16,
    color: '#666666'
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoImage: {
    width: 160,
    height: 160
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextBlack: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 1,
  },
  logoTextYellow: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FDB022',
    letterSpacing: 1,
  },
  menuIcon: {
    marginLeft: 8,
    justifyContent: 'center',
    gap: 3,
  },
  menuLine: {
    width: 20,
    height: 3,
    backgroundColor: '#FDB022',
    borderRadius: 2,
  },

  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B5EF9',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  eyeIcon: {
    padding: 4,
  },

  // Forgot Password
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3B5EF9',
    fontWeight: '500',
  },

  // Login Button
  loginButton: {
    height: 50,
    backgroundColor: '#FDB022',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FDB022',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#999999',
  },

  // Social Buttons
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  facebookIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1877F2',
    backgroundColor: '#E7F3FF',
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  socialButtonText: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },

  // Sign Up
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#666666',
  },
  signupLink: {
    fontSize: 14,
    color: '#FDB022',
    fontWeight: 'bold',
  },
});