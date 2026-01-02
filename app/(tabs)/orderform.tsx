import { cancelOrder, subscribeToActiveOrders, updateOrderItem, updateOrderStatus } from '@/services/orderService';
import { CheckCircle, ChefHat, Clock, Minus, Plus, Trash2, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Order {
  id: string;
  tableNumber: number;
  status: string;
  totalAmount: number;
  items: any[];
  createdAt: any;
  updatedAt: any;
}

export default function OrderFormScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const statusFilters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xử lý' },
    { key: 'preparing', label: 'Đang làm' },
    { key: 'served', label: 'Đã xong' },
  ];

  const filteredOrders = selectedStatus === 'all'
    ? orders
    : orders.filter(order => order.status === selectedStatus);

  useEffect(() => {
    // Setup real-time listener for orders
    setLoading(true);

    const unsubscribe = subscribeToActiveOrders((result: { success: boolean; orders?: Order[] }) => {
      if (result.success) {
        setOrders(result.orders || []);
      }
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng');
        // Real-time listener sẽ tự động cập nhật
        setModalVisible(false);
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateItemQuantity = async (orderId: string, itemId: string, delta: number) => {
    setIsUpdatingItem(true);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const item = order.items.find(i => i.id === itemId);
      if (!item) return;

      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        Alert.alert('Xác nhận', 'Bạn có muốn xóa món này?', [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              const result = await updateOrderItem(orderId, itemId, 0);
              if (result.success) {
                // Real-time listener sẽ tự động cập nhật
                if (selectedOrder?.id === orderId) {
                  const updated = orders.find(o => o.id === orderId);
                  setSelectedOrder(updated || null);
                }
              }
            }
          }
        ]);
        return;
      }

      const result = await updateOrderItem(orderId, itemId, newQuantity);
      if (result.success) {
        // Real-time listener sẽ tự động cập nhật
        if (selectedOrder?.id === orderId) {
          const updated = orders.find(o => o.id === orderId);
          setSelectedOrder(updated || null);
        }
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật số lượng');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra');
    } finally {
      setIsUpdatingItem(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Xác nhận hủy đơn',
      'Bạn có chắc muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const result = await cancelOrder(orderId);
              if (result.success) {
                Alert.alert('Thành công', 'Đã hủy đơn hàng');
                // Real-time listener sẽ tự động cập nhật
                setModalVisible(false);
              } else {
                Alert.alert('Lỗi', result.error || 'Không thể hủy đơn');
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Có lỗi xảy ra');
            } finally {
              setIsCancelling(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'preparing': return '#3b82f6';
      case 'served': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xử lý';
      case 'preparing': return 'Đang làm';
      case 'served': return 'Đã xong';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} color="#ffffff" />;
      case 'preparing': return <ChefHat size={16} color="#ffffff" />;
      case 'served': return <CheckCircle size={16} color="#ffffff" />;
      case 'cancelled': return <XCircle size={16} color="#ffffff" />;
      default: return null;
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

  const renderOrderCard = ({ item }: { item: Order }) => {
    // Hiển thị nút delete khi ở tab "Tất cả" hoặc "Đã xong"
    const showDeleteButton = selectedStatus === 'all' || selectedStatus === 'served';

    return (
      <View style={styles.orderCardWrapper}>
        <TouchableOpacity
          style={styles.orderCard}
          onPress={() => {
            setSelectedOrder(item);
            setModalVisible(true);
          }}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.tableNumber}>Bàn {item.tableNumber}</Text>
              <Text style={styles.orderId}>#{item.id.slice(-6)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              {getStatusIcon(item.status)}
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>

          <View style={styles.orderInfo}>
            <Text style={styles.itemCount}>{item.items?.length || 0} món</Text>
            <Text style={styles.totalAmount}>{formatCurrency(item.totalAmount || 0)}</Text>
          </View>

          <Text style={styles.orderTime}>{formatDate(item.createdAt)}</Text>
        </TouchableOpacity>

        {/* Delete button - chỉ hiển thị ở tab "Tất cả" và "Đã xong" */}
        {showDeleteButton && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleCancelOrder(item.id)}
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn Hàng</Text>
        <Text style={styles.subtitle}>{orders.length} đơn đang hoạt động</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContentContainer}
        >
          {statusFilters.map((filter) => {
            // Tính toán số lượng cho từng tab
            const count = filter.key === 'all'
              ? orders.length
              : orders.filter(o => o.status === filter.key).length;

            const isActive = selectedStatus === filter.key;

            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  isActive && styles.filterTabActive
                ]}
                onPress={() => setSelectedStatus(filter.key)}
              >
                <Text style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive
                ]}>
                  {filter.label}
                </Text>

                {/* Luôn hiển thị Badge để giữ layout ổn định */}
                <View style={[
                  styles.filterTabBadge,
                  isActive ? styles.filterTabBadgeActive : styles.filterTabBadgeInactive
                ]}>
                  <Text style={[
                    styles.filterTabBadgeText,
                    isActive ? styles.filterTabBadgeTextActive : styles.filterTabBadgeTextInactive
                  ]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Order Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Bàn {selectedOrder?.tableNumber}</Text>
                <Text style={styles.modalSubtitle}>#{selectedOrder?.id.slice(-6)}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Order Items */}
              <View style={styles.itemsContainer}>
                <Text style={styles.sectionTitle}>Món đã gọi</Text>
                {selectedOrder?.items?.map((item, index) => (
                  <View key={item.id || index} style={styles.orderItem}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                      {item.note && (
                        <Text style={styles.itemNote}>📝 {item.note}</Text>
                      )}
                    </View>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleUpdateItemQuantity(selectedOrder.id, item.id, -1)}
                        disabled={isUpdatingItem || selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled'}
                      >
                        <Minus size={16} color="#ffffff" />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleUpdateItemQuantity(selectedOrder.id, item.id, 1)}
                        disabled={isUpdatingItem || selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled'}
                      >
                        <Plus size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Order Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tổng cộng:</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(selectedOrder?.totalAmount || 0)}
                  </Text>
                </View>
              </View>

              {/* Timestamps */}
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampLabel}>Thời gian tạo:</Text>
                <Text style={styles.timestampValue}>{formatDate(selectedOrder?.createdAt)}</Text>
                {selectedOrder?.updatedAt && (
                  <>
                    <Text style={styles.timestampLabel}>Cập nhật lần cuối:</Text>
                    <Text style={styles.timestampValue}>{formatDate(selectedOrder?.updatedAt)}</Text>
                  </>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {selectedOrder?.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.preparingButton]}
                  onPress={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <ChefHat size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Bắt đầu làm</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {selectedOrder?.status === 'preparing' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.servedButton]}
                  onPress={() => handleUpdateStatus(selectedOrder.id, 'served')}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <CheckCircle size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Đã xong</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {(selectedOrder?.status === 'pending' || selectedOrder?.status === 'preparing') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => selectedOrder && handleCancelOrder(selectedOrder.id)}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Trash2 size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Hủy đơn</Text>
                    </>
                  )}
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  // Wrapper để tạo khoảng cách đẹp hơn
  filterWrapper: {
    height: 60, // Đảm bảo chiều cao cố định cho khu vực filter
    marginBottom: 8,
  },
  filterContainer: {
    flexGrow: 0, // Ngăn ScrollView chiếm hết chỗ
  },
  filterContentContainer: {
    gap: 12,
    paddingHorizontal: 20, // Padding đều 2 bên mép màn hình
    alignItems: 'center', // Căn giữa theo chiều dọc
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10, // Dùng padding vertical thay vì height cố định
    borderRadius: 24, // Bo tròn nhiều hơn (hình viên thuốc)
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
    // Loại bỏ minWidth để tab tự co giãn theo nội dung
  },
  filterTabActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    // Thêm shadow nhẹ để tab đang chọn nổi bật hơn
    shadowColor: "#10b981",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },

  // Base style cho Badge
  filterTabBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24, // Đảm bảo hình tròn/bầu dục đẹp ngay cả khi số nhỏ
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Style Badge khi Active (Nền mờ trắng)
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Style Badge khi Inactive (Nền xám đậm hơn nền tab một chút)
  filterTabBadgeInactive: {
    backgroundColor: '#e5e7eb',
  },

  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabBadgeTextActive: {
    color: '#ffffff',
  },
  filterTabBadgeTextInactive: {
    color: '#6b7280', // Màu chữ xám khi chưa chọn
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  orderCardWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  orderTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9ca3af',
  },
  itemsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#10b981',
  },
  itemNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  timestampContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timestampLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timestampValue: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  preparingButton: {
    backgroundColor: '#3b82f6',
  },
  servedButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
