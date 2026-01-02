import { getRevenueStats } from '@/services/orderService';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Order {
    id: string;
    tableNumber: number;
    totalAmount: number;
    paidAt: any;
    items: any[];
}

interface RevenueData {
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    orders: Order[];
}

export default function RevenueScreen() {
    const router = useRouter();
    const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<RevenueData>({
        totalRevenue: 0,
        orderCount: 0,
        averageOrderValue: 0,
        orders: [],
    });

    const periodFilters = [
        { key: 'today', label: 'Hôm nay' },
        { key: '7days', label: '7 ngày' },
        { key: '30days', label: '30 ngày' },
        { key: 'month', label: 'Tháng này' },
    ];

    useEffect(() => {
        loadRevenueData();
    }, [selectedPeriod]);

    const loadRevenueData = async () => {
        setLoading(true);
        try {
            const result = await getRevenueStats(selectedPeriod);
            if (result.success) {
                setRevenueData({
                    totalRevenue: result.totalRevenue || 0,
                    orderCount: result.orderCount || 0,
                    averageOrderValue: result.averageOrderValue || 0,
                    orders: result.orders || [],
                });
            }
        } catch (error) {
            console.error('Error loading revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('vi-VN');
    };

    const renderStatCard = (icon: React.ReactNode, label: string, value: string, color: string) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                {icon}
            </View>
            <View style={styles.statInfo}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{value}</Text>
            </View>
        </View>
    );

    const renderOrderItem = ({ item }: { item: Order }) => (
        <View style={styles.orderItem}>
            <View style={styles.orderHeader}>
                <View>
                    <Text style={styles.orderTable}>Bàn {item.tableNumber}</Text>
                    <Text style={styles.orderTime}>{formatDate(item.paidAt)}</Text>
                </View>
                <Text style={styles.orderAmount}>{formatCurrency(item.totalAmount)}</Text>
            </View>
            <Text style={styles.orderItems}>{item.items?.length || 0} món</Text>
        </View>
    );

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Báo cáo doanh thu</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                    contentContainerStyle={styles.filterContent}
                >
                    {periodFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.filterTab,
                                selectedPeriod === filter.key && styles.filterTabActive,
                            ]}
                            onPress={() => setSelectedPeriod(filter.key)}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    selectedPeriod === filter.key && styles.filterTabTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#10b981" />
                        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.content}>
                        {/* Stats Cards */}
                        <View style={styles.statsContainer}>
                            {renderStatCard(
                                <DollarSign size={24} color="#10b981" />,
                                'Tổng doanh thu',
                                formatCurrency(revenueData.totalRevenue),
                                '#10b981'
                            )}
                            {renderStatCard(
                                <ShoppingBag size={24} color="#3b82f6" />,
                                'Số đơn hàng',
                                revenueData.orderCount.toString(),
                                '#3b82f6'
                            )}
                            {renderStatCard(
                                <TrendingUp size={24} color="#f59e0b" />,
                                'Giá trị TB/đơn',
                                formatCurrency(revenueData.averageOrderValue),
                                '#f59e0b'
                            )}
                        </View>

                        {/* Orders List */}
                        <View style={styles.ordersSection}>
                            <Text style={styles.sectionTitle}>
                                Danh sách đơn hàng ({revenueData.orderCount})
                            </Text>
                            {revenueData.orders.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={revenueData.orders}
                                    renderItem={renderOrderItem}
                                    keyExtractor={(item) => item.id}
                                    scrollEnabled={false}
                                />
                            )}
                        </View>
                    </ScrollView>
                )}
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
    filterContainer: {
        maxHeight: 60,
        marginBottom: 20,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    filterTab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    filterTabActive: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    filterTabTextActive: {
        color: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    content: {
        flex: 1,
    },
    statsContainer: {
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 30,
    },
    statCard: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    ordersSection: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    orderItem: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    orderTable: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    orderTime: {
        fontSize: 12,
        color: '#9ca3af',
    },
    orderAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#10b981',
    },
    orderItems: {
        fontSize: 14,
        color: '#6b7280',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
    },
});
