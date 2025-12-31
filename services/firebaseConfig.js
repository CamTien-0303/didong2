import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// --- CHỖ NÀY DÁN CẤU HÌNH CỦA BẠN VÀO ---
const firebaseConfig = {
  apiKey: "AIzaSyCuey_DZiLlaPUv2EvZYBBIQ-ZsZpEMcnQ",
  authDomain: "smartorder-c8be1.firebaseapp.com",
  projectId: "smartorder-c8be1",
  storageBucket: "smartorder-c8be1.firebasestorage.app",
  messagingSenderId: "130691733256",
  appId: "1:130691733256:web:0f06d05cfca5ff5e107ebd",
  measurementId: "G-ZL9YLQ4Y3E"
};

// --- ĐOẠN CODE FIX LỖI DUPLICATE APP ---
let app;
if (getApps().length === 0) {
  // Chưa có App nào -> Khởi tạo mới
  app = initializeApp(firebaseConfig);
} else {
  // Đã có App rồi -> Lấy lại dùng tiếp (không tạo mới)
  app = getApp();
}

// Khởi tạo Auth (giữ nguyên logic check Platform)
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

const db = getFirestore(app);

export { auth, db };
