import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, Modal, Alert 
} from 'react-native';
import { CLOTHING_ITEMS, CATEGORIES } from '../../constants/clothingData';
import { Plus, TrendingUp, Tag, X, Check } from 'lucide-react-native';

export default function MenuScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Logic lọc sản phẩm
  const filteredItems = selectedCategory === 'All' 
    ? CLOTHING_ITEMS 
    : CLOTHING_ITEMS.filter(item => item.category === selectedCategory);

  const bestSellers = CLOTHING_ITEMS.filter(item => item.isBestSeller);
  const onSaleItems = CLOTHING_ITEMS.filter(item => item.isOnSale);

  // Mở modal chọn size
  const handleOpenAddToCart = (item: any) => {
    setSelectedItem(item);
    setSelectedSize(item.sizes[0]); // Mặc định chọn size đầu tiên
    setModalVisible(true);
  };

  // Xác nhận thêm vào giỏ
  const confirmAddToCart = () => {
    Alert.alert("Thành công", `Đã thêm ${selectedItem.name} (Size: ${selectedSize}) vào giỏ!`);
    setModalVisible(false);
  };

  // Component hiển thị từng món đồ (Card)
  const renderCard = ({ item }: { item: any }) => {
    const discount = item.originalPrice 
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : 0;

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.image} />
        
        {/* Badges (Hot / Sale) */}
        <View style={styles.badgeContainer}>
          {item.isBestSeller && (
            <View style={[styles.badge, styles.badgeHot]}>
              <TrendingUp size={12} color="white" />
              <Text style={styles.badgeText}>Hot</Text>
            </View>
          )}
          {item.isOnSale && (
            <View style={[styles.badge, styles.badgeSale]}>
              <Tag size={12} color="white" />
              <Text style={styles.badgeText}>-{discount}%</Text>
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          
          <View style={styles.priceRow}>
            <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
              <Text style={styles.price}>${item.price}</Text>
              {item.originalPrice && (
                <Text style={styles.originalPrice}>${item.originalPrice}</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => handleOpenAddToCart(item)}
            >
              <Plus color="white" size={20} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Danh Mục (Chạy ngang) */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.catButton, selectedCategory === cat && styles.catButtonActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 2. Danh sách sản phẩm chính */}
      <FlatList
        data={filteredItems}
        renderItem={renderCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          // Phần hiển thị Trending & Sale ở đầu danh sách (chỉ hiện khi chọn 'All')
          selectedCategory === 'All' ? (
            <View>
              {/* Trending Section */}
              <View style={styles.sectionHeader}>
                <TrendingUp color="#f97316" size={20} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
              <FlatList 
                horizontal 
                data={bestSellers} 
                renderItem={renderCard} 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 20}}
              />

              {/* Sale Section */}
              <View style={styles.sectionHeader}>
                <Tag color="#db2777" size={20} />
                <Text style={styles.sectionTitle}>Flash Sale</Text>
              </View>
               <FlatList 
                horizontal 
                data={onSaleItems} 
                renderItem={renderCard} 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 20}}
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>👕 All Items</Text>
              </View>
            </View>
          ) : null
        )}
      />

      {/* 3. Modal Chọn Size (Thay thế cho Dialog) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Size</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="white" size={24} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View>
                <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                <View style={styles.sizeGrid}>
                  {selectedItem.sizes.map((size: string) => (
                    <TouchableOpacity
                      key={size}
                      style={[styles.sizeOption, selectedSize === size && styles.sizeOptionSelected]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextSelected]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.modalAddButton}
                  onPress={confirmAddToCart}
                >
                  <Text style={styles.modalAddButtonText}>Add to Cart - ${selectedItem.price}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles Dark Mode
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // Gray 900
    paddingTop: 50,
  },
  // Categories
  categoryContainer: {
    height: 60,
  },
  categoryList: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  catButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937', // Gray 800
    borderWidth: 1,
    borderColor: '#374151',
  },
  catButtonActive: {
    backgroundColor: '#db2777', // Pink 600
    borderColor: '#db2777',
  },
  catText: {
    color: '#9ca3af', // Gray 400
    fontWeight: '600',
  },
  catTextActive: {
    color: 'white',
  },
  // List
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Card Item
  card: {
    backgroundColor: '#1f2937', // Gray 800
    borderRadius: 16,
    marginBottom: 16,
    marginRight: 16, // Cho danh sách ngang
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
    width: 280, // Chiều rộng cố định cho danh sách ngang
  },
  image: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeHot: { backgroundColor: '#f97316' }, // Orange
  badgeSale: { backgroundColor: '#db2777' }, // Pink
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  
  cardInfo: { padding: 12 },
  cardName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: '#ec4899', fontSize: 18, fontWeight: 'bold' },
  originalPrice: { color: '#6b7280', fontSize: 12, textDecorationLine: 'line-through', marginLeft: 6 },
  
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#db2777',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#374151',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  modalItemName: { color: '#9ca3af', marginBottom: 16 },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  sizeOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  sizeOptionSelected: {
    borderColor: '#db2777',
    backgroundColor: '#db2777',
  },
  sizeText: { color: '#d1d5db' },
  sizeTextSelected: { color: 'white', fontWeight: 'bold' },
  modalAddButton: {
    backgroundColor: 'linear-gradient(...)', // RN ko hỗ trợ linear gradient đơn giản, dùng màu đơn
    backgroundColor: '#db2777', 
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalAddButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});