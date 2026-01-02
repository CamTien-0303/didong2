import { auth } from '@/services/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Lock,
  LogOut,
  Moon,
  Settings as SettingsIcon,
  Sun,
  User,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load theme preference
    const savedTheme = await AsyncStorage.getItem('@app_theme');
    setIsDarkMode(savedTheme !== 'light');

    // Load user info
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserEmail(currentUser.email || '');
    }
  };

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    await AsyncStorage.setItem('@app_theme', newTheme);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user_token');
              await auth.signOut();
              router.replace('/login');
            } catch (error) {
              console.error('Lỗi đăng xuất:', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại!');
            }
          },
        },
      ]
    );
  };

  const colors = isDarkMode
    ? {
      background: '#111827',
      surface: '#1f2937',
      text: '#ffffff',
      textSecondary: '#9ca3af',
      primary: '#10b981',
      border: '#374151',
    }
    : {
      background: '#ffffff',
      surface: '#f3f4f6',
      text: '#1f2937',
      textSecondary: '#6b7280',
      primary: '#10b981',
      border: '#e5e7eb',
    };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <SettingsIcon size={32} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Cài đặt</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Smart Order Management System
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        {userEmail && (
          <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary + '20' }]}>
              <User size={24} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {userEmail.split('@')[0]}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {userEmail}
              </Text>
            </View>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Tài khoản
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/profile')}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Thông tin tài khoản
              </Text>
              <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/change-password')}
            >
              <View style={styles.menuItemLeft}>
                <Lock size={20} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Đổi mật khẩu
                </Text>
              </View>
              <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reports Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Báo cáo
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/revenue')}
            >
              <View style={styles.menuItemLeft}>
                <BarChart3 size={20} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Báo cáo doanh thu
                </Text>
              </View>
              <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SettingsIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Giao diện
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
              <View style={styles.menuItemLeft}>
                {isDarkMode ? (
                  <Moon size={20} color={colors.textSecondary} />
                ) : (
                  <Sun size={20} color={colors.textSecondary} />
                )}
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  {isDarkMode ? 'Chế độ tối' : 'Chế độ sáng'}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#fff" />
        <Text style={styles.logoutButtonText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemArrow: {
    fontSize: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
