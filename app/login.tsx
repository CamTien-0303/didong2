// app/login.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient'; // Thư viện màu nền
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eye, EyeOff, Zap, Check } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    // 1. Validate form
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Giả lập gọi API (delay 1 giây)
      setTimeout(async () => {
        // Lấy dữ liệu user đã đăng ký (dùng key 'temp_user_db' như ở bước Register trước)
        const jsonValue = await AsyncStorage.getItem('temp_user_db');
        const storedUser = jsonValue != null ? JSON.parse(jsonValue) : null;
        
        // Logic kiểm tra đăng nhập
        // Chấp nhận: User đã đăng ký HOẶC tài khoản Demo có sẵn
        const isDemoUser = email === 'demo@revolt.com' && password === 'demo123';
        const isRegisteredUser = storedUser && storedUser.email === email && storedUser.password === password;

        if (isRegisteredUser || isDemoUser) {
          // Lưu token đăng nhập
          await AsyncStorage.setItem('user_token', 'token_vip_123');
          
          Alert.alert('Thành công', 'Đăng nhập thành công!');
          
          // Chuyển vào màn hình chính
          router.replace('/(tabs)');
        } else {
          Alert.alert('Thất bại', 'Email hoặc mật khẩu không đúng');
        }
        setIsLoading(false);
      }, 1000);

    } catch (e) {
      setIsLoading(false);
      Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  return (
    // Tạo nền Gradient tím -> hồng -> cam
    <LinearGradient
      colors={['#9333ea', '#db2777', '#f97316']} 
      style={styles.background}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* LOGO SECTION */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Zap color="#facc15" fill="#facc15" size={40} />
            </View>
            <Text style={styles.appName}>REVOLT</Text>
            <Text style={styles.appSlogan}>Street Style Revolution</Text>
          </View>

          {/* LOGIN FORM CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng Nhập</Text>
            <Text style={styles.cardSubtitle}>Chào mừng bạn quay trở lại!</Text>

            {/* Input Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, marginTop: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? 
                    <EyeOff color="rgba(255,255,255,0.7)" size={20} /> : 
                    <Eye color="rgba(255,255,255,0.7)" size={20} />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Checkbox & Forgot Password */}
            <View style={styles.rowBetween}>
              <TouchableOpacity 
                style={styles.checkboxContainer} 
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Check size={12} color="#db2777" />}
                </View>
                <Text style={styles.checkboxLabel}>Ghi nhớ đăng nhập</Text>
              </TouchableOpacity>

              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <LinearGradient
                  colors={['#db2777', '#9333ea']}
                  start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                  style={styles.gradientButton}
                >
                  <Text style={styles.loginButtonText}>Đăng Nhập</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            {/* Switch to Register */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.linkText}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>

            {/* Demo Account Info */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Tài khoản demo:</Text>
              <Text style={styles.demoText}>Email: demo@revolt.com</Text>
              <Text style={styles.demoText}>Pass: demo123</Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  // Logo Styles
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, backgroundColor: 'black', borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 4, borderColor: 'white',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
  },
  appName: { fontSize: 28, fontWeight: 'bold', color: 'white', letterSpacing: 2 },
  appSlogan: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },

  // Card Styles (Glassmorphism)
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Nền đen mờ
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Viền kính
  },
  cardTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  cardSubtitle: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 },

  // Input Styles
  inputGroup: { marginBottom: 16 },
  label: { color: 'white', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
  },

  // Options Styles
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginRight: 8,
    justifyContent: 'center', alignItems: 'center'
  },
  checkboxChecked: { backgroundColor: 'white' },
  checkboxLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  forgotPassword: { color: '#facc15', fontSize: 14 }, // Màu vàng

  // Button Styles
  loginButton: {
    height: 50, borderRadius: 12, overflow: 'hidden', marginBottom: 24,
  },
  gradientButton: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Footer Styles
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  footerText: { color: 'rgba(255,255,255,0.7)' },
  linkText: { color: '#facc15', fontWeight: 'bold' },

  // Demo Box
  demoBox: {
    backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center'
  },
  demoTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 },
  demoText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
});