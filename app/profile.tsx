import { auth } from '@/services/firebaseConfig';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Mail, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const [userInfo, setUserInfo] = useState({
        email: '',
        displayName: '',
        uid: '',
        createdAt: '',
    });

    useEffect(() => {
        loadUserInfo();
    }, []);

    const loadUserInfo = () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUserInfo({
                email: currentUser.email || '',
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                uid: currentUser.uid,
                createdAt: currentUser.metadata.creationTime || '',
            });
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Thông tin tài khoản</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.content}>
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <User size={48} color="#10b981" />
                        </View>
                        <Text style={styles.displayName}>{userInfo.displayName}</Text>
                    </View>

                    {/* Info Cards */}
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>

                        {/* Email */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoIcon}>
                                <Mail size={20} color="#10b981" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{userInfo.email}</Text>
                            </View>
                        </View>

                        {/* User ID */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoIcon}>
                                <User size={20} color="#3b82f6" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>User ID</Text>
                                <Text style={styles.infoValue} numberOfLines={1}>
                                    {userInfo.uid}
                                </Text>
                            </View>
                        </View>

                        {/* Created At */}
                        {userInfo.createdAt && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoIcon}>
                                    <Text style={styles.infoIconText}>📅</Text>
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Ngày tạo tài khoản</Text>
                                    <Text style={styles.infoValue}>
                                        {new Date(userInfo.createdAt).toLocaleDateString('vi-VN')}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Note */}
                    <View style={styles.noteCard}>
                        <Text style={styles.noteText}>
                            💡 Để cập nhật thông tin tài khoản, vui lòng liên hệ quản trị viên hệ thống.
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    displayName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    infoSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoIconText: {
        fontSize: 20,
    },
    infoContent: {
        flex: 1,
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    noteCard: {
        margin: 20,
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#fbbf24',
    },
    noteText: {
        fontSize: 14,
        color: '#92400e',
        lineHeight: 20,
    },
});
