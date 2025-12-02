// app/index.tsx
import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      // Nếu có token -> đã đăng nhập
      setIsLoggedIn(!!token); 
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#db2777" />
      </View>
    );
  }

  // Nếu đã đăng nhập -> Vào thẳng tab Home
  if (isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  }

  // Nếu chưa đăng nhập -> Vào trang Login
  return <Redirect href="/login" />;
}