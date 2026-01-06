import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from "firebase/auth";
import { auth } from "./firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const loginWithGoogle = async (idToken) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const loginWithFacebook = async (accessToken) => {
  try {
    const credential = FacebookAuthProvider.credential(accessToken);
    const userCredential = await signInWithCredential(auth, credential);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, message: 'Không tìm thấy người dùng' };
    }

    // Re-authenticate user with current password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error) {
    let message = 'Đổi mật khẩu thất bại';
    if (error.code === 'auth/wrong-password') {
      message = 'Mật khẩu hiện tại không đúng';
    } else if (error.code === 'auth/weak-password') {
      message = 'Mật khẩu mới quá yếu (tối thiểu 6 ký tự)';
    }
    return { success: false, message };
  }
};

/**
 * Reset password - send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    let message = 'Gửi email reset mật khẩu thất bại';
    if (error.code === 'auth/user-not-found') {
      message = 'Email không tồn tại trong hệ thống';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Email không hợp lệ';
    }
    return { success: false, message };
  }
};