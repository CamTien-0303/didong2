import { changePassword } from '@/services/authService';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận không khớp');
            return;
        }

        if (currentPassword === newPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải khác mật khẩu hiện tại');
            return;
        }

        setLoading(true);
        try {
            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
                Alert.alert('Thành công', 'Đã đổi mật khẩu thành công', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Lỗi', result.message || 'Đổi mật khẩu thất bại');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={true}
            animationType="slide"
            transparent={true}
            onRequestClose={() => router.back()}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Đổi Mật Khẩu</Text>
                        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                            <X size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Current Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mật khẩu hiện tại</Text>
                            <View style={styles.passwordContainer}>
                                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    placeholderTextColor="#6b7280"
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry={!showCurrentPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    style={styles.eyeIcon}
                                >
                                    {showCurrentPassword ? (
                                        <EyeOff size={20} color="#9ca3af" />
                                    ) : (
                                        <Eye size={20} color="#9ca3af" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mật khẩu mới</Text>
                            <View style={styles.passwordContainer}>
                                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                    placeholderTextColor="#6b7280"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNewPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    style={styles.eyeIcon}
                                >
                                    {showNewPassword ? (
                                        <EyeOff size={20} color="#9ca3af" />
                                    ) : (
                                        <Eye size={20} color="#9ca3af" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                            <View style={styles.passwordContainer}>
                                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Nhập lại mật khẩu mới"
                                    placeholderTextColor="#6b7280"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={20} color="#9ca3af" />
                                    ) : (
                                        <Eye size={20} color="#9ca3af" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Info */}
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                • Mật khẩu phải có ít nhất 6 ký tự{'\n'}
                                • Mật khẩu mới phải khác mật khẩu hiện tại
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Đổi mật khẩu</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingHorizontal: 24,
        paddingBottom: 40,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    closeButton: {
        padding: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
        marginBottom: 8,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    passwordInput: {
        flex: 1,
        height: 50,
        fontSize: 15,
        color: '#ffffff',
    },
    eyeIcon: {
        padding: 4,
    },
    infoBox: {
        backgroundColor: '#10b98120',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    infoText: {
        fontSize: 13,
        color: '#10b981',
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#374151',
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#10b981',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
