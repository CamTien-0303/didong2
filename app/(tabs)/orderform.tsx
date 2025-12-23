import { CustomerType, Order, OrderItemStatus, OrderStatus } from '@/types/order';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowRight,
    Bell,
    Check,
    Clock,
    Edit2,
    FileText,
    Minus,
    Plus,
    Search,
    Trash2,
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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const ORDERS_KEY = 'orders';
const TABLES_KEY = 'tables';

type FilterType = 'ALL' | 'CHO_XAC_NHAN' | 'DANG_LAM' | 'HOAN_TAT';

export default function OrderListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadOrders();
      if (orderId) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          setSelectedOrder(order);
          setDetailModalVisible(true);
        }
      }
    }, [orderId])
  );

  useEffect(() => {
    filterOrders();
  }, [orders, activeFilter, searchText]);

  const loadOrders = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      if (savedOrders) {
        const allOrders: Order[] = JSON.parse(savedOrders);
        // Load tất cả orders, filter sẽ được thực hiện ở filterOrders
        setOrders(allOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Lỗi load orders:', error);
      setOrders([]);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by status
    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(order => {
        const status = getOrderStatus(order);
        return status === activeFilter;
      });
    } else {
      // Filter "Tất cả" chỉ hiển thị các đơn chưa thanh toán (đang hoạt động)
      filtered = filtered.filter(order => !order.paidAt);
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(order => 
        order.tableName.toLowerCase().includes(searchLower) ||
        order.orderCode.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created time (newest first)
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    setFilteredOrders(filtered);
  };

  const getOrderStatus = (order: Order): OrderStatus => {
    if (order.status) return order.status;
    if (order.paidAt) return 'HOAN_TAT';
    if (order.confirmedAt) return 'DANG_LAM';
    return 'CHO_XAC_NHAN';
  };

  const getStatusLabel = (status: OrderStatus): string => {
    switch (status) {
      case 'CHO_XAC_NHAN': return 'CHỜ XÁC NHẬN';
      case 'DANG_LAM': return 'ĐANG LÀM';
      case 'HOAN_TAT': return 'HOÀN TẤT';
      default: return 'CHỜ XÁC NHẬN';
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'CHO_XAC_NHAN': return '#ef4444';
      case 'DANG_LAM': return '#f59e0b';
      case 'HOAN_TAT': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return {
          backgroundColor: '#ef4444',
          textColor: '#fff',
        };
      case 'DANG_LAM':
        return {
          backgroundColor: '#fbbf24',
          textColor: '#000',
        };
      case 'HOAN_TAT':
        return {
          backgroundColor: '#10b981',
          textColor: '#fff',
        };
      default:
        return {
          backgroundColor: '#6b7280',
          textColor: '#fff',
        };
    }
  };

  const getCustomerTypeLabel = (type?: CustomerType): string => {
    switch (type) {
      case 'KHACH_LE': return 'Khách lẻ';
      case 'DAT_TRUOC': return 'Đặt trước';
      case 'VIP': return 'VIP';
      default: return 'Khách lẻ';
    }
  };

  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const getPendingCount = (): number => {
    return orders.filter(o => getOrderStatus(o) === 'CHO_XAC_NHAN').length;
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const acceptOrder = async (order: Order) => {
    try {
      const updatedOrder: Order = {
        ...order,
        status: 'DANG_LAM',
        confirmedAt: Date.now(),
      };
      
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
      const updatedOrders = allOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
      
      await loadOrders();
      setDetailModalVisible(false);
      Alert.alert('Thành công', 'Đã nhận đơn hàng');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể nhận đơn hàng');
    }
  };

  const rejectOrder = async (order: Order) => {
    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc muốn hủy đơn hàng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
              const allOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
              const updatedOrders = allOrders.filter(o => o.id !== order.id);
              await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
              
              await loadOrders();
              setDetailModalVisible(false);
              Alert.alert('Thành công', 'Đã hủy đơn hàng');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
            }
          },
        },
      ]
    );
  };

  const updateItemStatus = async (itemId: string, status: OrderItemStatus) => {
    if (!selectedOrder) return;

    try {
      const updatedItems = selectedOrder.items.map((item) =>
        item.id === itemId ? { ...item, status } : item
      );

      const updatedOrder: Order = {
        ...selectedOrder,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };

      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
      const updatedOrders = allOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));

      setSelectedOrder(updatedOrder);
      await loadOrders();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái món');
    }
  };

  const updateQuantity = async (itemId: string, delta: number) => {
    if (!selectedOrder) return;

    try {
      const updatedItems = selectedOrder.items
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0);

      const updatedOrder: Order = {
        ...selectedOrder,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };

      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
      const updatedOrders = allOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));

      setSelectedOrder(updatedOrder);
      await loadOrders();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật số lượng');
    }
  };

  const cancelItem = async (itemId: string) => {
    if (!selectedOrder) return;

    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc muốn hủy món này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedItems = selectedOrder.items.filter((item) => item.id !== itemId);
              const updatedOrder: Order = {
                ...selectedOrder,
                items: updatedItems,
                total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
              };

              const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
              const allOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
              const updatedOrders = allOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
              await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));

              setSelectedOrder(updatedOrder);
              await loadOrders();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể hủy món');
            }
          },
        },
      ]
    );
  };

  const openNoteModal = (itemId: string) => {
    if (!selectedOrder) return;
    const item = selectedOrder.items.find((i) => i.id === itemId);
    setSelectedItemId(itemId);
    setNoteText(item?.note || '');
    setNoteModalVisible(true);
  };

  const saveNote = async () => {
    if (!selectedOrder || !selectedItemId) return;

    try {
      const updatedItems = selectedOrder.items.map((item) =>
        item.id === selectedItemId ? { ...item, note: noteText.trim() || undefined } : item
      );

      const updatedOrder: Order = {
        ...selectedOrder,
        items: updatedItems,
      };

      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
      const updatedOrders = allOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));

      setSelectedOrder(updatedOrder);
      setNoteModalVisible(false);
      setSelectedItemId(null);
      setNoteText('');
      await loadOrders();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu ghi chú');
    }
  };

  const completeOrder = async () => {
    if (!selectedOrder) return;

    Alert.alert(
      'Hoàn tất đơn hàng',
      'Xác nhận hoàn tất đơn hàng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              const updatedOrder: Order = {
                ...selectedOrder,
                status: 'HOAN_TAT',
                servedAt: Date.now(),
              };

              const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
              const allOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
              const updatedOrders = allOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
              await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));

              await loadOrders();
              setDetailModalVisible(false);
              Alert.alert('Thành công', 'Đã hoàn tất đơn hàng');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể hoàn tất đơn hàng');
            }
          },
        },
      ]
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const status = getOrderStatus(item);
    const statusColor = getStatusColor(status);
    const isPending = status === 'CHO_XAC_NHAN';
    const isHighlighted = isPending;

    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          isHighlighted && styles.orderCardHighlighted
        ]}
        onPress={() => handleOrderClick(item)}
      >
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardTitle}>
            <Text style={styles.tableName}>{item.tableName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeStyle(status).backgroundColor }]}>
              {isPending && <Bell size={12} color={getStatusBadgeStyle(status).textColor} />}
              {status === 'HOAN_TAT' && <Check size={12} color={getStatusBadgeStyle(status).textColor} />}
              <Text style={[styles.statusText, { color: getStatusBadgeStyle(status).textColor }]}>
                {getStatusLabel(status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.orderCardInfo}>
          <Text style={styles.orderCode}>{item.orderCode || `#ORD-${item.id.slice(-4)}`}</Text>
          <Text style={styles.customerType}>
            {getCustomerTypeLabel(item.customerType)}
          </Text>
        </View>

        <View style={styles.orderCardMeta}>
          <View style={styles.metaRow}>
            <Clock size={14} color={isPending ? '#ef4444' : '#9ca3af'} />
            <Text style={[styles.metaText, isPending && styles.metaTextHighlighted]}>
              {getTimeAgo(item.createdAt)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Utensils size={14} color={isPending ? '#ef4444' : '#9ca3af'} />
            <Text style={[styles.metaText, isPending && styles.metaTextHighlighted]}>
              {item.items.length} món
            </Text>
          </View>
          <Text style={styles.totalText}>
            {item.total.toLocaleString('vi-VN')}₫
          </Text>
        </View>

        <View style={styles.orderCardActions}>
          {isPending ? (
            <>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={(e) => {
                  e.stopPropagation();
                  rejectOrder(item);
                }}
              >
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={(e) => {
                  e.stopPropagation();
                  acceptOrder(item);
                }}
              >
                <Text style={styles.acceptButtonText}>Nhận đơn</Text>
              </TouchableOpacity>
            </>
          ) : status === 'HOAN_TAT' ? (
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={(e) => {
                e.stopPropagation();
                Alert.alert('Thanh toán', `Tổng tiền: ${item.total.toLocaleString('vi-VN')}₫`);
              }}
            >
              <Text style={styles.paymentButtonText}>Thanh toán</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.detailButton}
              onPress={(e) => {
                e.stopPropagation();
                handleOrderClick(item);
              }}
            >
              <Text style={styles.detailButtonText}>Chi tiết</Text>
              <ArrowRight size={16} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh sách Đơn hàng</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={async () => {
            await loadOrders(); // Reload orders trước khi navigate
            router.push('/');
          }}
        >
          <Plus size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bàn hoặc mã đơn..."
          placeholderTextColor="#6b7280"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'ALL' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'CHO_XAC_NHAN' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('CHO_XAC_NHAN')}
          >
            <Text style={[styles.filterText, activeFilter === 'CHO_XAC_NHAN' && styles.filterTextActive]}>
              Chờ xác nhận
            </Text>
            {getPendingCount() > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{getPendingCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'DANG_LAM' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('DANG_LAM')}
          >
            <Text style={[styles.filterText, activeFilter === 'DANG_LAM' && styles.filterTextActive]}>
              Đang làm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'HOAN_TAT' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('HOAN_TAT')}
          >
            <Text style={[styles.filterText, activeFilter === 'HOAN_TAT' && styles.filterTextActive]}>
              Hoàn tất
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
          </View>
        }
      />

      {/* Order Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedOrder.tableName}</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedOrder.orderCode || `#ORD-${selectedOrder.id.slice(-4)}`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={selectedOrder.items}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.detailItem}>
                      <View style={styles.detailItemLeft}>
                        <View style={styles.detailItemHeader}>
                          <Text style={styles.detailItemName}>{item.menuItemName}</Text>
                          <View style={[
                            styles.itemStatusBadge,
                            item.status === 'DA_PHUC_VU' 
                              ? { backgroundColor: '#d1fae5' }
                              : { backgroundColor: '#fef3c7' }
                          ]}>
                            {item.status === 'DA_PHUC_VU' ? (
                              <>
                                <Check size={12} color="#10b981" />
                                <Text style={[styles.itemStatusText, { color: '#10b981' }]}>
                                  Đã phục vụ
                                </Text>
                              </>
                            ) : (
                              <Text style={[styles.itemStatusText, { color: '#f59e0b' }]}>
                                Đang làm
                              </Text>
                            )}
                          </View>
                        </View>
                        
                        <View style={styles.detailItemQuantity}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.id, -1)}
                          >
                            <Minus size={14} color="#fff" />
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>Số lượng: {item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.id, 1)}
                          >
                            <Plus size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>

                        {item.note && (
                          <View style={styles.noteContainer}>
                            <FileText size={12} color="#9ca3af" />
                            <Text style={styles.noteText}>{item.note}</Text>
                          </View>
                        )}

                        <View style={styles.detailItemPriceRow}>
                          <Text style={styles.detailItemPriceLabel}>Đơn giá:</Text>
                          <Text style={styles.detailItemUnitPrice}>
                            {item.price.toLocaleString('vi-VN')}₫
                          </Text>
                        </View>
                        <Text style={styles.detailItemTotalPrice}>
                          Tổng: {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                        </Text>
                      </View>

                      <View style={styles.detailItemActions}>
                        <TouchableOpacity
                          style={styles.actionIconButton}
                          onPress={() => openNoteModal(item.id)}
                        >
                          <Edit2 size={18} color="#6b7280" />
                        </TouchableOpacity>
                        
                        {item.status === 'DANG_LAM' && (
                          <TouchableOpacity
                            style={styles.completeItemButton}
                            onPress={() => updateItemStatus(item.id, 'DA_PHUC_VU')}
                          >
                            <Check size={16} color="#10b981" />
                            <Text style={styles.completeItemText}>Hoàn thành</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                          style={styles.deleteItemButton}
                          onPress={() => cancelItem(item.id)}
                        >
                          <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  contentContainerStyle={styles.detailListContent}
                  ListEmptyComponent={
                    <View style={styles.emptyDetailContainer}>
                      <Text style={styles.emptyDetailText}>Chưa có món nào trong đơn</Text>
                    </View>
                  }
                />

                <View style={styles.modalFooter}>
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Tổng tiền:</Text>
                    <Text style={styles.totalAmount}>
                      {selectedOrder.total.toLocaleString('vi-VN')}₫
                    </Text>
                  </View>
                  {getOrderStatus(selectedOrder) === 'DANG_LAM' && (
                    <TouchableOpacity style={styles.completeButton} onPress={completeOrder}>
                      <Text style={styles.completeButtonText}>Hoàn tất</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Note Modal */}
      <Modal
        visible={noteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ghi chú món</Text>
              <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder="Nhập ghi chú cho món..."
              placeholderTextColor="#6b7280"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setNoteModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={saveNote}
              >
                <Text style={styles.saveModalButtonText}>Lưu</Text>
              </TouchableOpacity>
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
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#111827',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 8,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
  },
  filterText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  orderCardHighlighted: {
    borderColor: '#ef4444',
  },
  orderCardHeader: {
    marginBottom: 10,
  },
  orderCardTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderCardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderCode: {
    fontSize: 14,
    color: '#9ca3af',
  },
  customerType: {
    fontSize: 14,
    color: '#9ca3af',
  },
  orderCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  metaTextHighlighted: {
    color: '#ef4444',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  orderCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rejectButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  detailListContent: {
    paddingBottom: 20,
  },
  detailItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  detailItemLeft: {
    flex: 1,
    marginBottom: 12,
  },
  detailItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  itemStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  itemStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailItemQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  quantityButton: {
    backgroundColor: '#374151',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: '#9ca3af',
    minWidth: 100,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
  },
  detailItemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailItemPriceLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailItemUnitPrice: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailItemTotalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  detailItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  completeItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  completeItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  deleteItemButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  emptyDetailContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDetailText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 15,
    marginTop: 15,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    color: '#9ca3af',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  completeButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#374151',
  },
  cancelModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveModalButton: {
    backgroundColor: '#10b981',
  },
  saveModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
