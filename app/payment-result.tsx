import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, XCircle } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PaymentResultScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const status = params.status as string;

    const isSuccess = status === 'success';
    const isCancel = status === 'cancel';

    useEffect(() => {
        // Auto close sau 5 giây
        const timer = setTimeout(() => {
            router.replace('/(tabs)');
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        router.replace('/(tabs)');
    };

    return (
        <Modal
            visible={true}
            animationType="fade"
            transparent={true}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {isSuccess ? (
                        <>
                            <CheckCircle size={80} color="#10b981" />
                            <Text style={styles.successTitle}>Thanh toán thành công!</Text>
                            <Text style={styles.successMessage}>
                                Giao dịch đã được xử lý thành công.{'\n'}
                                Cảm ơn bạn đã sử dụng dịch vụ!
                            </Text>
                        </>
                    ) : isCancel ? (
                        <>
                            <XCircle size={80} color="#f59e0b" />
                            <Text style={styles.cancelTitle}>Đã hủy thanh toán</Text>
                            <Text style={styles.cancelMessage}>
                                Bạn đã hủy giao dịch.{'\n'}
                                Vui lòng thử lại nếu cần.
                            </Text>
                        </>
                    ) : (
                        <>
                            <XCircle size={80} color="#ef4444" />
                            <Text style={styles.errorTitle}>Thanh toán thất bại</Text>
                            <Text style={styles.errorMessage}>
                                Đã có lỗi xảy ra trong quá trình thanh toán.{'\n'}
                                Vui lòng liên hệ hỗ trợ.
                            </Text>
                        </>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            isSuccess
                                ? styles.successButton
                                : isCancel
                                    ? styles.cancelButton
                                    : styles.errorButton,
                        ]}
                        onPress={handleClose}
                    >
                        <Text style={styles.buttonText}>
                            {isSuccess ? 'Hoàn tất' : 'Đóng'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.autoCloseText}>
                        Tự động đóng sau 5 giây...
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#10b981',
        marginTop: 20,
        marginBottom: 12,
    },
    successMessage: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    cancelTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#f59e0b',
        marginTop: 20,
        marginBottom: 12,
    },
    cancelMessage: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ef4444',
        marginTop: 20,
        marginBottom: 12,
    },
    errorMessage: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 48,
        borderRadius: 12,
        minWidth: 200,
    },
    successButton: {
        backgroundColor: '#10b981',
    },
    cancelButton: {
        backgroundColor: '#f59e0b',
    },
    errorButton: {
        backgroundColor: '#ef4444',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    autoCloseText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 16,
    },
});
