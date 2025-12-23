// app/register.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Check, Eye, EyeOff, Lock, Mail, User, Utensils } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const handleSubmit = async () => {
    // 1. Dừng sự kiện mặc định (chỉ cần gọi async function là được)
    
    // 2. Validate form
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Lỗi', 'Email không hợp lệ.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    
    if (!agreedTerms) {
      Alert.alert('Lỗi', 'Vui lòng đồng ý với Điều khoản dịch vụ.');
      return;
    }

    setIsLoading(true);

    try {
      // 3. Simulate API call (delay 1 giây)
      setTimeout(async () => {
        // Kiểm tra xem user đã tồn tại chưa (trong AsyncStorage)
        const storedUserJson = await AsyncStorage.getItem('temp_user_db');
        const storedUser = storedUserJson ? JSON.parse(storedUserJson) : null;

        if (storedUser && storedUser.email === email) {
            Alert.alert('Lỗi', 'Email này đã được đăng ký.');
            setIsLoading(false);
            return;
        }

        // Lưu dữ liệu user
        const userData = {
          name,
          email,
          password,
          createdAt: new Date().toISOString(),
        };
        // Sử dụng key 'temp_user_db' để Login.tsx có thể đọc được
        await AsyncStorage.setItem('temp_user_db', JSON.stringify(userData));
        
        Alert.alert('Thành công', 'Đăng ký thành công! Hãy đăng nhập.');
        setIsLoading(false);
        
        // Chuyển sang trang Login
        router.replace('/login');
      }, 1000);
      
    } catch (e) {
      setIsLoading(false);
      Alert.alert('Lỗi', 'Lỗi hệ thống khi lưu dữ liệu.');
    }
  };

  return (
    // Tạo nền Gradient tím -> hồng -> cam (Giống màn hình Login)
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
              <Utensils color="#facc15" fill="#facc15" size={40} />
            </View>
            <Text style={styles.appName}>Smart Order</Text>
            <Text style={styles.appSlogan}>Hệ thống quản lý đặt món thông minh</Text>
          </View>

          {/* REGISTER FORM CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng Ký</Text>
            <Text style={styles.cardSubtitle}>Tạo tài khoản mới để bắt đầu</Text>

            {/* Input Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <View style={styles.passwordContainer}>
                <User color="rgba(255,255,255,0.7)" size={20} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, marginTop: 0 }]}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Input Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.passwordContainer}>
                <Mail color="rgba(255,255,255,0.7)" size={20} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, marginTop: 0 }]}
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.passwordContainer}>
                <Lock color="rgba(255,255,255,0.7)" size={20} style={{marginRight: 8}} />
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
              <Text style={styles.passwordHint}>Tối thiểu 6 ký tự</Text>
            </View>

            {/* Input Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <View style={styles.passwordContainer}>
                <Lock color="rgba(255,255,255,0.7)" size={20} style={{marginRight: 8}} />
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, marginTop: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? 
                    <EyeOff color="rgba(255,255,255,0.7)" size={20} /> : 
                    <Eye color="rgba(255,255,255,0.7)" size={20} />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Conditions (Checkbox) */}
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setAgreedTerms(!agreedTerms)}
            >
              <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                {agreedTerms && <Check size={12} color="#db2777" />}
              </View>
              <Text style={styles.termsText}>
                Tôi đồng ý với{' '}
                <Text style={styles.termsLink}>Điều khoản dịch vụ</Text>
                {' '}và{' '}
                <Text style={styles.termsLink}>Chính sách bảo mật</Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity 
              style={styles.registerButton} 
              onPress={handleSubmit}
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
                  <Text style={styles.registerButtonText}>Đăng Ký</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            {/* Switch to Login */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.linkText}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// Styles (Dùng chung với Login để đồng bộ giao diện Glassmorphism)
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
  appName: { fontSize: 28, fontWeight: 'bold', color: 'white', textAlign: 'center', alignSelf: 'center', letterSpacing: 2 },
  appSlogan: { color: 'rgba(255,255,255,0.9)', fontSize: 16, textAlign: 'center',
  alignSelf: 'center',},

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
  passwordHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },

  // Terms and Conditions
  termsContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 24, 
    paddingRight: 10 
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginRight: 8,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: 'white' },
  termsText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, flexShrink: 1 },
  termsLink: { color: '#facc15', textDecorationLine: 'underline' }, // Màu vàng

  // Button Styles
  registerButton: {
    height: 50, borderRadius: 12, overflow: 'hidden', marginBottom: 24,
  },
  gradientButton: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Footer Styles
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: 'rgba(255,255,255,0.7)' },
  linkText: { color: '#facc15', fontWeight: 'bold' },
});