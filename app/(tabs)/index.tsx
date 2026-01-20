import { auth } from '@/services/firebaseConfig';
import {
  completeAllTableOrders,
  getTotalAmountByTable
} from '@/services/orderService';
import {
  initializeTables,
  subscribeToTables
} from '@/services/tableService';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, Clock, CreditCard, DollarSign, RefreshCw, Users, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

type TableStatus = 'TRONG' | 'CO_KHACH' | 'CHO_MON' | 'DA_PHUC_VU';

type Area = {
  id: string;
  name: string;
  totalTables: number;
};

type Table = {
  id: string;
  number: number;
  area: string;
  status: TableStatus;
  guests?: number;
  capacity: number;
  duration?: number;
  totalAmount?: number;
  startTime?: any;
};

const AREAS: Area[] = [
  { id: 'tang1', name: 'Tầng 1', totalTables: 12 },
  { id: 'tang2', name: 'Tầng 2', totalTables: 8 },
  { id: 'sanvuon', name: 'Sân vườn', totalTables: 6 },
  { id: 'vip', name: 'VIP', totalTables: 4 },
];

export default function TableMapScreen() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedArea, setSelectedArea] = useState('tang1');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [userName, setUserName] = useState('Nhân viên');
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestCount, setGuestCount] = useState('4');
  const [tableTotalAmount, setTableTotalAmount] = useState(0);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isQRPaymentProcessing, setIsQRPaymentProcessing] = useState(false);

  useEffect(() => {
    getUserInfo();
    setupFirestoreListener();
  }, []);

  const getUserInfo = () => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName || user.email?.split('@')[0] || 'Nhân viên');
      }
    });
  };

  const setupFirestoreListener = () => {
    // Subscribe to realtime updates from Firestore
    const unsubscribe = subscribeToTables((result) => {
      if (result.success) {
        console.log('📊 Tables updated from Firestore:', result.tables.length);
        setTables(result.tables);
        setIsLoading(false);
        setIsConnected(true);

        // If no tables, initialize them
        if (result.tables.length === 0 && !isInitializing) {
          handleInitializeTables();
        }
      } else {
        console.error('❌ Error loading tables:', result.error);
        setIsLoading(false);
        setIsConnected(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  };

  const handleInitializeTables = async () => {
    setIsInitializing(true);
    Alert.alert(
      'Khởi tạo dữ liệu',
      'Chưa có dữ liệu bàn. Bạn có muốn tạo dữ liệu mặc định không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => setIsInitializing(false)
        },
        {
          text: 'Tạo',
          onPress: async () => {
            const result = await initializeTables();
            if (result.success) {
              Alert.alert('Thành công', 'Đã tạo dữ liệu bàn');
            } else {
              Alert.alert('Lỗi', result.error || 'Không thể tạo dữ liệu');
            }
            setIsInitializing(false);
          }
        }
      ]
    );
  };

  const refreshTables = () => {
    // Firestore auto-updates via listener, just show feedback
    Alert.alert('Đã làm mới', 'Dữ liệu đang được đồng bộ realtime');
    setIsConnected(true);
  };

  const getTableStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'CO_KHACH':
        return '#10b981';
      case 'CHO_MON':
        return '#f59e0b';
      case 'DA_PHUC_VU':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getTableStatusLabel = (status: TableStatus) => {
    switch (status) {
      case 'CO_KHACH':
        return 'KHÁCH';
      case 'CHO_MON':
        return 'CHỜ MÓN';
      case 'DA_PHUC_VU':
        return 'ĐÃ PHỤC VỤ';
      default:
        return 'TRỐNG';
    }
  };

  const getAreaTables = () => {
    return tables.filter(t => t.area === selectedArea);
  };

  const getAreaStats = (areaId: string) => {
    const areaTables = tables.filter(t => t.area === areaId);
    const emptyCount = areaTables.filter(t => t.status === 'TRONG').length;
    return `${emptyCount}/${areaTables.length}`;
  };

  const openTableDetail = async (table: Table) => {
    setSelectedTable(table);

    // Load total amount for the table if it has guests
    if (table.status !== 'TRONG') {
      const { success, totalAmount } = await getTotalAmountByTable(table.id);
      if (success) {
        setTableTotalAmount(totalAmount);
      }
    } else {
      setTableTotalAmount(0);
    }
  };

  const closeTableDetail = () => {
    setSelectedTable(null);
  };

  const openTable = async (table: Table) => {
    if (table.status === 'TRONG') {
      // Show modal to input guest count
      setShowGuestModal(true);
    } else {
      // Navigate directly to menu to add more items
      closeTableDetail();
      router.push({
        pathname: '/(tabs)/menu',
        params: {
          tableId: table.id,
          tableNumber: table.number,
          guests: table.guests || 0,
          isAddingMore: 'true' // Flag to create new order instead of loading old one
        },
      });
    }
  };

  const confirmOpenTable = () => {
    if (!selectedTable) return;

    setShowGuestModal(false);
    closeTableDetail();

    // Navigate to menu screen
    router.push({
      pathname: '/(tabs)/menu',
      params: {
        tableId: selectedTable.id,
        tableNumber: selectedTable.number,
        guests: guestCount
      }
    });

    // Reset guest count
    setGuestCount('4');
  };

  const handleCashPayment = async () => {
    if (!selectedTable) return;

    Alert.alert(
      'Thanh toán tiền mặt',
      `Tổng tiền: ${tableTotalAmount.toLocaleString('vi-VN')}₫\n\nBạn có chắc muốn thanh toán bằng tiền mặt và đóng bàn?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thanh toán',
          onPress: async () => {
            setIsPaymentProcessing(true);
            try {
              const result = await completeAllTableOrders(selectedTable.id);
              if (result.success) {
                Alert.alert('Thành công', 'Đã thanh toán và đóng bàn');
                closeTableDetail();
              } else {
                Alert.alert('Lỗi', result.error || 'Không thể thanh toán');
              }
            } finally {
              setIsPaymentProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleQRPayment = async () => {
    if (!selectedTable) return;

    try {
      setIsQRPaymentProcessing(true);

      // Get actual orders from Firebase to calculate correct total
      const { getAllOrdersByTable } = await import('@/services/orderService');
      const { success, orders } = await getAllOrdersByTable(selectedTable.id);

      if (!success || !orders || orders.length === 0) {
        Alert.alert('Lỗi', 'Không tìm thấy đơn hàng cho bàn này');
        setIsQRPaymentProcessing(false);
        return;
      }

      // Filter active orders - exclude cancelled AND completed (already paid) orders
      const activeOrders = orders.filter((order: any) =>
        order.status !== 'cancelled' && order.status !== 'completed'
      );

      if (activeOrders.length === 0) {
        Alert.alert('Lỗi', 'Không có đơn hàng để thanh toán');
        setIsQRPaymentProcessing(false);
        return;
      }

      let allItems: any[] = [];
      let calculatedTotal = 0;

      activeOrders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          allItems = [...allItems, ...order.items];
          const orderTotal = order.items.reduce((sum: number, item: any) => {
            return sum + ((item.price || 0) * (item.quantity || 0));
          }, 0);
          calculatedTotal += orderTotal;
        }
      });

      console.log('💰 Payment calculation:', {
        tableId: selectedTable.id,
        totalOrders: activeOrders.length,
        totalItems: allItems.length,
        calculatedTotal,
        displayedTotal: tableTotalAmount
      });

      // Create order object for payment API
      const orderForPayment = {
        id: selectedTable.id,
        tableNumber: selectedTable.number,
        totalAmount: Math.round(calculatedTotal),
        items: allItems
      };

      // Call PayOS API to create payment link
      const { createPaymentLink } = await import('@/services/paymentService');
      const result = await createPaymentLink(orderForPayment);

      if (result.success && result.data?.checkoutUrl) {
        // Close modal first
        closeTableDetail();

        // Open PayOS checkout URL in browser
        const { Linking } = await import('react-native');
        const canOpen = await Linking.canOpenURL(result.data.checkoutUrl);

        if (canOpen) {
          await Linking.openURL(result.data.checkoutUrl);
          Alert.alert(
            'Đang chuyển đến trang thanh toán',
            `Tổng tiền: ${orderForPayment.totalAmount.toLocaleString('vi-VN')}₫\n\nVui lòng hoàn tất thanh toán trong trình duyệt.`
          );
        } else {
          Alert.alert('Lỗi', 'Không thể mở link thanh toán');
        }
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể tạo link thanh toán');
      }
    } catch (error: any) {
      console.error('Error opening payment:', error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra');
    } finally {
      setIsQRPaymentProcessing(false);
    }
  };

  const renderTableCard = ({ item }: { item: Table }) => {
    const statusColor = getTableStatusColor(item.status);
    const statusLabel = getTableStatusLabel(item.status);

    // Calculate duration if table is occupied
    let displayDuration = item.duration || 0;
    if (item.startTime && item.status !== 'TRONG') {
      const now = Date.now();
      const start = item.startTime.toMillis ? item.startTime.toMillis() : item.startTime;
      displayDuration = Math.floor((now - start) / 60000); // minutes
    }

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          { borderColor: statusColor }
        ]}
        onPress={() => openTableDetail(item)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.tableName}>Bàn {String(item.number).padStart(2, '0')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          {item.status === 'TRONG' ? (
            <View style={styles.emptyInfo}>
              <View style={styles.infoItem}>
                <Users size={16} color="#9ca3af" />
                <Text style={styles.emptyText}>0/{item.capacity}</Text>
              </View>
              <View style={styles.infoItem}>
                <Clock size={16} color="#9ca3af" />
                <Text style={styles.emptyText}>--</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.infoItem}>
                <Users size={16} color={statusColor} />
                <Text style={[styles.infoText, { color: statusColor }]}>
                  {item.guests || 0}/{item.capacity}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Clock size={16} color={statusColor} />
                <Text style={[styles.infoText, { color: statusColor }]}>
                  {displayDuration}p
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerLabel}>Tạm tính</Text>
          <Text style={[
            styles.footerAmount,
            { color: item.status === 'TRONG' ? '#9ca3af' : statusColor }
          ]}>
            {item.status === 'TRONG' ? '0đ' : `${Math.floor((item.totalAmount || 0) / 1000)}k`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const areaTables = getAreaTables();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{userName}</Text>
            <View style={styles.connectionStatus}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: isConnected ? '#10b981' : '#ef4444' }
              ]} />
              <Text style={styles.statusText}>
                {isConnected ? 'Đang hoạt động' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <Bell size={20} color="#1f2937" />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Area Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.areaNav}
        contentContainerStyle={styles.areaNavContent}
      >
        {AREAS.map(area => {
          const isSelected = selectedArea === area.id;
          const stats = getAreaStats(area.id);

          return (
            <TouchableOpacity
              key={area.id}
              style={[
                styles.areaTab,
                isSelected && styles.areaTabActive
              ]}
              onPress={() => setSelectedArea(area.id)}
            >
              <Text style={[
                styles.areaTabText,
                isSelected && styles.areaTabTextActive
              ]}>
                {area.name} ({stats})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Table Grid */}
      {areaTables.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Không có bàn</Text>
          <TouchableOpacity
            style={styles.initButton}
            onPress={handleInitializeTables}
          >
            <Text style={styles.initButtonText}>Tạo dữ liệu mặc định</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={areaTables}
          renderItem={renderTableCard}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          key={`flatlist-${selectedArea}`}
        />
      )}

      {/* FAB Refresh Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={refreshTables}
        activeOpacity={0.8}
      >
        <RefreshCw size={24} color="#fff" />
      </TouchableOpacity>

      {/* Table Detail Modal */}
      <Modal
        visible={selectedTable !== null}
        transparent
        animationType="slide"
        onRequestClose={closeTableDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTable && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Bàn {selectedTable.number}</Text>
                    <Text style={[
                      styles.modalStatus,
                      { color: getTableStatusColor(selectedTable.status) }
                    ]}>
                      {getTableStatusLabel(selectedTable.status)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeTableDetail}>
                    <X size={24} color="#1f2937" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {selectedTable.status === 'TRONG' ? (
                    <View style={styles.emptyTableInfo}>
                      <Users size={48} color="#94a3b8" />
                      <Text style={styles.emptyTableText}>Bàn đang trống</Text>
                      <Text style={styles.capacityText}>
                        Sức chứa: {selectedTable.capacity} khách
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.infoRow}>
                        <Users size={20} color="#10b981" />
                        <Text style={styles.infoLabel}>Số khách:</Text>
                        <Text style={styles.infoValue}>
                          {selectedTable.guests || 0}/{selectedTable.capacity}
                        </Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Clock size={20} color="#10b981" />
                        <Text style={styles.infoLabel}>Thời gian:</Text>
                        <Text style={styles.infoValue}>
                          {selectedTable.duration || 0} phút
                        </Text>
                      </View>

                      <View style={styles.infoRow}>
                        <DollarSign size={20} color="#10b981" />
                        <Text style={styles.infoLabel}>Tổng tiền:</Text>
                        <Text style={styles.infoValueHighlight}>
                          {tableTotalAmount.toLocaleString('vi-VN')}₫
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {selectedTable.status === 'DA_PHUC_VU' ? (
                  <View style={styles.paymentButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.paymentButton, styles.cashButton]}
                      onPress={handleCashPayment}
                      disabled={isPaymentProcessing || isQRPaymentProcessing}
                    >
                      {isPaymentProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Wallet size={20} color="#fff" />
                          <Text style={styles.paymentButtonText}>Tiền mặt</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.paymentButton, styles.qrButton]}
                      onPress={handleQRPayment}
                      disabled={isPaymentProcessing || isQRPaymentProcessing}
                    >
                      {isQRPaymentProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <CreditCard size={20} color="#fff" />
                          <Text style={styles.paymentButtonText}>Thanh toán QR</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.openButton}
                    onPress={() => openTable(selectedTable)}
                  >
                    <Text style={styles.openButtonText}>
                      {selectedTable.status === 'TRONG' ? 'Mở bàn' : 'Gọi món thêm'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Guest Count Modal */}
      <Modal
        visible={showGuestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Số lượng khách</Text>
              <TouchableOpacity onPress={() => setShowGuestModal(false)}>
                <X size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.guestInputContainer}>
              <Text style={styles.guestLabel}>Bàn {selectedTable?.number}</Text>
              <TextInput
                style={styles.guestInput}
                value={guestCount}
                onChangeText={setGuestCount}
                keyboardType="numeric"
                placeholder="Nhập số khách"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.capacityHint}>
                Sức chứa: {selectedTable?.capacity} khách
              </Text>
            </View>

            <TouchableOpacity
              style={styles.openButton}
              onPress={confirmOpenTable}
            >
              <Text style={styles.openButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDB022',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },

  areaNav: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 56,
  },
  areaNavContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  areaTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#374151',
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  areaTabActive: {
    backgroundColor: '#ef4444',
  },
  areaTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  areaTabTextActive: {
    color: '#fff',
  },

  gridContent: {
    padding: 8,
    paddingBottom: 100,
  },
  tableCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardContent: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyInfo: {
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  footerAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
  },
  initButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  initButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
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
    color: '#1f2937',
  },
  modalStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  modalBody: {
    marginBottom: 24,
  },
  emptyTableInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTableText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
  },
  capacityText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6b7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  infoValueHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  openButton: {
    backgroundColor: '#FDB022',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Payment buttons
  paymentButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cashButton: {
    backgroundColor: '#10b981',
  },
  qrButton: {
    backgroundColor: '#8b5cf6',
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  guestInputContainer: {
    marginBottom: 24,
  },
  guestLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  guestInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  capacityHint: {
    fontSize: 14,
    color: '#6b7280',
  },
});
