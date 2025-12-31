import {
  removeOrderItem,
  subscribeToAllOrders,
  updateOrderItem,
  updateOrderStatus
} from '@/services/orderService';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  Check,
  Clock,
  Minus,
  Plus,
  Utensils,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Status mapping: Firestore -> UI
const STATUS_MAP: any = {
  'pending': { label: 'Chờ xác nhận', color: '#EF4444', bg: '#FEE2E2', icon: Bell },
  'preparing': { label: 'Đang làm', color: '#F59E0B', bg: '#FEF3C7', icon: Utensils },
  'served': { label: 'Đã phục vụ', color: '#10B981', bg: '#D1FAE5', icon: Check },
  'completed': { label: 'Hoàn tất', color: '#6B7280', bg: '#F3F4F6', icon: Check },
  'cancelled': { label: 'Đã hủy', color: '#9CA3AF', bg: '#F3F4F6', icon: X },
};

export default function OrderListScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, pending, preparing, served

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Subscribe to ALL orders
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const unsub = subscribeToAllOrders((result) => {
        if (result.success) {
          setOrders(result.orders);
        }
        setLoading(false);
      });
      return () => unsub();
    }, [])
  );

  useEffect(() => {
    filterOrders();
  }, [orders, activeFilter, searchText]);

  const filterOrders = () => {
    let result = [...orders];

    // 1. Filter by tab
    if (activeFilter !== 'ALL') {
      if (activeFilter === 'others') {
        result = result.filter(o => ['completed', 'cancelled'].includes(o.status));
      } else {
        result = result.filter(o => o.status === activeFilter);
      }
    } else {
      // Default: exclude completed/cancelled to focus on active
      result = result.filter(o => !['completed', 'cancelled'].includes(o.status));
    }

    // 2. Search
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(o =>
        (o.tableName || '').toLowerCase().includes(lower) ||
        (o.id || '').toLowerCase().includes(lower)
      );
    }

    setFilteredOrders(result);
  };

  // Actions
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.id === orderId) {
      setDetailModalVisible(false); // Close modal on status change or update local state logic
    }
  };

  const handleUpdateItemQuantity = async (orderId: string, itemId: string, qty: number, delta: number) => {
    const newQty = qty + delta;
    if (newQty <= 0) {
      Alert.alert('Xóa món', 'Bạn có chắc muốn xóa món này?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => removeOrderItem(orderId, itemId) }
      ]);
    } else {
      await updateOrderItem(orderId, itemId, newQty);
    }
  };

  // Renderers
  const renderOrderItem = ({ item }: { item: any }) => {
    const config = STATUS_MAP[item.status] || STATUS_MAP['pending'];
    const StatusIcon = config.icon;
    const isPending = item.status === 'pending';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedOrder(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.tableName}>{item.tableName || `Bàn ${item.tableNumber}`}</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <StatusIcon size={12} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.timeText}>
            <Clock size={12} color="#9CA3AF" /> {new Date(item.createdAt?.seconds * 1000 || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.itemCount}>
            <Utensils size={12} color="#9CA3AF" /> {(item.items || []).length} món
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalPrice}>{(item.totalAmount || 0).toLocaleString('vi-VN')}₫</Text>
          {isPending && (
            <TouchableOpacity
              style={styles.btnAction}
              onPress={() => handleUpdateStatus(item.id, 'preparing')}
            >
              <Text style={styles.btnActionText}>Nhận đơn</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Đơn hàng</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {[
            { id: 'ALL', label: 'Hiện tại' },
            { id: 'pending', label: 'Chờ xác nhận' },
            { id: 'preparing', label: 'Đang làm' },
            { id: 'served', label: 'Đã phục vụ' },
            { id: 'others', label: 'Lịch sử' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeFilter === tab.id && styles.tabActive]}
              onPress={() => setActiveFilter(tab.id)}
            >
              <Text style={[styles.tabText, activeFilter === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              {/* Count badge logic could go here */}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>}
      />

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedOrder?.tableName || `Bàn ${selectedOrder?.tableNumber}`}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {(selectedOrder?.items || []).map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>{item.price?.toLocaleString('vi-VN')}₫</Text>
                  </View>
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => handleUpdateItemQuantity(selectedOrder.id, item.menuId, item.quantity, -1)}
                    >
                      <Minus size={16} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => handleUpdateItemQuantity(selectedOrder.id, item.menuId, item.quantity, 1)}
                    >
                      <Plus size={16} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalValue}>{(selectedOrder?.totalAmount || 0).toLocaleString('vi-VN')}₫</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedOrder?.status === 'pending' && (
                <TouchableOpacity style={[styles.fullBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleUpdateStatus(selectedOrder.id, 'preparing')}>
                  <Text style={styles.fullBtnText}>Xác nhận & Làm món</Text>
                </TouchableOpacity>
              )}
              {selectedOrder?.status === 'preparing' && (
                <TouchableOpacity style={[styles.fullBtn, { backgroundColor: '#10B981' }]} onPress={() => handleUpdateStatus(selectedOrder.id, 'served')}>
                  <Text style={styles.fullBtnText}>Báo đã xong</Text>
                </TouchableOpacity>
              )}
              {selectedOrder?.status === 'served' && (
                <TouchableOpacity style={[styles.fullBtn, { backgroundColor: '#374151' }]} onPress={() => handleUpdateStatus(selectedOrder.id, 'completed')}>
                  <Text style={styles.fullBtnText}>Thanh toán & Đóng</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  filterContainer: { paddingVertical: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  tabActive: { backgroundColor: '#111827' },
  tabText: { fontWeight: '600', color: '#4B5563' },
  tabTextActive: { color: '#FFFFFF' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tableName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  timeText: { color: '#6B7280', fontSize: 13 },
  itemCount: { color: '#6B7280', fontSize: 13 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#EF4444' },
  btnAction: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnActionText: { color: '#FFF', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  itemName: { fontSize: 16, fontWeight: '500', color: '#111827' },
  itemPrice: { color: '#6B7280', fontSize: 14 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8 },
  qtyBtn: { padding: 8 },
  qtyText: { fontWeight: '600', paddingHorizontal: 8 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 18, fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: '#EF4444' },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  fullBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  fullBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
