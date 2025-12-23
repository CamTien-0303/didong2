import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Bell, Menu, Plus, Search, Clock, Users, LogOut } from 'lucide-react-native';
import { Table, TableStatus } from '@/types/order';

const STORAGE_KEY = 'tables';
const ORDERS_KEY = 'orders';

export default function TablePlanScreen() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'TRONG' | 'CO_KHACH' | 'DA_DAT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      // Kiểm tra authentication mỗi khi vào màn hình
      const checkAuthAndLoad = async () => {
        try {
          const token = await AsyncStorage.getItem('user_token');
          if (!token) {
            router.replace('/login');
            return;
          }
          // Nếu đã đăng nhập thì load dữ liệu
          await loadTables();
        } catch (error) {
          router.replace('/login');
        }
      };
      checkAuthAndLoad();
    }, [router])
  );

  const loadTables = async () => {
    try {
      const savedTables = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedTables) {
        setTables(JSON.parse(savedTables));
      } else {
        // Tạo dữ liệu mẫu
        const defaultTables: Table[] = Array.from({ length: 8 }, (_, i) => ({
          id: `table-${i + 1}`,
          name: `Bàn ${String(i + 1).padStart(2, '0')}`,
          status: i < 2 ? 'CO_KHACH' : i === 4 ? 'DA_DAT' : 'TRONG',
          capacity: [4, 4, 2, 6, 4, 10][i] || 4,
          createdAt: Date.now(),
        }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTables));
        setTables(defaultTables);
      }
    } catch (error) {
      console.error('Lỗi load bàn:', error);
    }
  };

  const openTable = async (tableId: string) => {
    try {
      const updated = tables.map((t) =>
        t.id === tableId ? { ...t, status: 'CO_KHACH' as TableStatus } : t
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTables(updated);
      // Navigate to order screen
      router.push({
        pathname: '/order',
        params: { tableId },
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở bàn');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user_token');
              router.replace('/login');
            } catch (error) {
              console.error('Lỗi đăng xuất:', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại!');
            }
          },
        },
      ]
    );
  };

  const filteredTables = tables.filter((table) => {
    const matchesFilter = selectedFilter === 'ALL' || table.status === selectedFilter;
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTableStatusInfo = (table: Table) => {
    switch (table.status) {
      case 'CO_KHACH':
        return { label: 'Có khách', color: '#10b981', bgColor: '#d1fae5' };
      case 'DA_DAT':
        return { label: 'Đã đặt', color: '#f59e0b', bgColor: '#fef3c7' };
      default:
        return { label: 'Trống', color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  const renderTable = ({ item }: { item: Table }) => {
    const statusInfo = getTableStatusInfo(item);
    const isOccupied = item.status === 'CO_KHACH';
    const isReserved = item.status === 'DA_DAT';

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          isOccupied && styles.tableCardOccupied,
          isReserved && styles.tableCardReserved,
        ]}
        onPress={() => {
          if (item.status === 'TRONG') {
            openTable(item.id);
          } else if (item.status === 'CO_KHACH') {
            router.push({
              pathname: '/order',
              params: { tableId: item.id },
            });
          }
        }}
      >
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        <Text style={styles.tableName}>{item.name}</Text>

        {isOccupied && (
          <>
            <View style={styles.infoRow}>
              <Clock size={16} color="#10b981" />
              <Text style={styles.infoText}>45 phút</Text>
            </View>
            <Text style={styles.totalText}>Tổng: 560.000₫</Text>
          </>
        )}

        {isReserved && (
          <>
            <View style={styles.infoRow}>
              <Clock size={16} color="#f59e0b" />
              <Text style={styles.infoText}>18:30</Text>
            </View>
            <Text style={styles.reservedName}>Mr. Hoàng</Text>
          </>
        )}

        {item.status === 'TRONG' && (
          <View style={styles.infoRow}>
            <Users size={16} color="#6b7280" />
            <Text style={styles.infoText}>{item.capacity} ghế</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Menu size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sơ đồ bàn</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
            <LogOut size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Bell size={24} color="#fff" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bàn..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['ALL', 'TRONG', 'CO_KHACH', 'DA_DAT'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter === 'ALL'
                ? 'Tất cả'
                : filter === 'TRONG'
                ? 'Trống'
                : filter === 'CO_KHACH'
                ? 'Có khách'
                : 'Đã đặt'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Table Grid */}
      <FlatList
        data={filteredTables}
        renderItem={renderTable}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Open Button */}
      <TouchableOpacity
        style={styles.quickOpenButton}
        onPress={() => {
          const emptyTable = tables.find((t) => t.status === 'TRONG');
          if (emptyTable) {
            openTable(emptyTable.id);
          } else {
            Alert.alert('Thông báo', 'Không có bàn trống');
          }
        }}
      >
        <Plus size={24} color="#fff" />
        <Text style={styles.quickOpenText}>Mở bàn nhanh</Text>
      </TouchableOpacity>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerButton: {
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
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
    marginBottom: 20,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  tableCard: {
    width: '48%',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#374151',
  },
  tableCardOccupied: {
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  tableCardReserved: {
    backgroundColor: '#78350f',
    borderColor: '#f59e0b',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 8,
  },
  reservedName: {
    fontSize: 14,
    color: '#f59e0b',
    marginTop: 8,
  },
  quickOpenButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickOpenText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
