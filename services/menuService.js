import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const MENU_COLLECTION = 'menu';

/**
 * Initialize default menu items - Vietnamese food
 */
export const initializeMenu = async () => {
    try {
        const menuItems = [
            // Món chính
            {
                id: 'pho-bo',
                name: 'Phở bò',
                description: 'Phở bò truyền thống Hà Nội với thịt bò tươi ngon',
                price: 70000,
                category: 'mon-chinh',
                imageUrl: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400',
                available: true,
                rating: 4.8,
            },
            {
                id: 'pho-ga',
                name: 'Phở gà',
                description: 'Phở gà thơm ngon, nước dùng ngọt tự nhiên',
                price: 65000,
                category: 'mon-chinh',
                imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400',
                available: true,
                rating: 4.7,
            },
            {
                id: 'bun-bo-hue',
                name: 'Bún bò Huế',
                description: 'Bún bò Huế cay nồng đặc trưng miền Trung',
                price: 75000,
                category: 'mon-chinh',
                imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400',
                available: true,
                rating: 4.9,
            },
            {
                id: 'bun-cha',
                name: 'Bún chả',
                description: 'Bún chả Hà Nội với thịt nướng thơm lừng',
                price: 70000,
                category: 'mon-chinh',
                imageUrl: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=400',
                available: true,
                rating: 4.8,
            },
            {
                id: 'com-tam-suon',
                name: 'Cơm tấm sườn',
                description: 'Cơm tấm sườn nướng Sài Gòn',
                price: 65000,
                category: 'mon-chinh',
                imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400',
                available: true,
                rating: 4.6,
            },
            {
                id: 'com-ga-roti',
                name: 'Cơm gà roti',
                description: 'Cơm gà roti thơm phức với nước tương đậm đà',
                price: 60000,
                category: 'mon-chinh',
                imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400',
                available: true,
                rating: 4.7,
            },

            // Khai vị
            {
                id: 'goi-cuon',
                name: 'Gỏi cuốn',
                description: 'Gỏi cuốn tươi với tôm thịt (2 cuộn)',
                price: 35000,
                category: 'khai-vi',
                imageUrl: 'https://images.unsplash.com/photo-1559847844-56fec5b57f3a?w=400',
                available: true,
                rating: 4.5,
            },
            {
                id: 'nem-ran',
                name: 'Nem rán',
                description: 'Nem rán giòn tan (5 cái)',
                price: 40000,
                category: 'khai-vi',
                imageUrl: 'https://images.unsplash.com/photo-1562158147-f44bec48e2b9?w=400',
                available: true,
                rating: 4.6,
            },
            {
                id: 'goi-ngo-sen',
                name: 'Gỏi ngó sen tôm thịt',
                description: 'Gỏi ngó sen giòn ngọt với tôm thịt',
                price: 55000,
                category: 'khai-vi',
                imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
                available: true,
                rating: 4.7,
            },

            // Món phụ
            {
                id: 'canh-chua',
                name: 'Canh chua cá',
                description: 'Canh chua cá lóc miền Nam',
                price: 80000,
                category: 'mon-phu',
                imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
                available: true,
                rating: 4.5,
            },
            {
                id: 'rau-muong-xao',
                name: 'Rau muống xào tỏi',
                description: 'Rau muống xào tỏi giòn ngọt',
                price: 30000,
                category: 'mon-phu',
                imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
                available: true,
                rating: 4.3,
            },

            // Nước uống
            {
                id: 'tra-da',
                name: 'Trà đá',
                description: 'Trà đá truyền thống',
                price: 10000,
                category: 'nuoc-uong',
                imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
                available: true,
                rating: 4.2,
            },
            {
                id: 'nuoc-chanh',
                name: 'Nước chanh tươi',
                description: 'Nước chanh tươi mát lạnh',
                price: 20000,
                category: 'nuoc-uong',
                imageUrl: 'https://images.unsplash.com/photo-1583064313642-a7c149480c7e?w=400',
                available: true,
                rating: 4.6,
            },
            {
                id: 'nuoc-dua',
                name: 'Nước dừa tươi',
                description: 'Nước dừa tươi mát',
                price: 25000,
                category: 'nuoc-uong',
                imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
                available: true,
                rating: 4.7,
            },
            {
                id: 'ca-phe-sua',
                name: 'Cà phê sữa đá',
                description: 'Cà phê sữa đá đậm đà',
                price: 25000,
                category: 'nuoc-uong',
                imageUrl: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400',
                available: true,
                rating: 4.8,
            },

            // Tráng miệng
            {
                id: 'che-ba-mau',
                name: 'Chè ba màu',
                description: 'Chè ba màu truyền thống',
                price: 25000,
                category: 'trang-mieng',
                imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
                available: true,
                rating: 4.5,
            },
            {
                id: 'banh-flan',
                name: 'Bánh flan',
                description: 'Bánh flan mềm mịn',
                price: 20000,
                category: 'trang-mieng',
                imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
                available: true,
                rating: 4.4,
            },
            {
                id: 'che-thap-cam',
                name: 'Chè thập cẩm',
                description: 'Chè thập cẩm đầy đủ nguyên liệu',
                price: 30000,
                category: 'trang-mieng',
                imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
                available: true,
                rating: 4.6,
            },

            // Combo
            {
                id: 'combo-pho',
                name: 'Combo Phở',
                description: 'Phở bò + Nước chanh + Nem rán (2 cái)',
                price: 95000,
                category: 'combo',
                imageUrl: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400',
                available: true,
                rating: 4.8,
            },
            {
                id: 'combo-com-tam',
                name: 'Combo Cơm tấm',
                description: 'Cơm tấm sườn + Trà đá + Chè',
                price: 85000,
                category: 'combo',
                imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400',
                available: true,
                rating: 4.7,
            },
        ];

        for (const item of menuItems) {
            const itemRef = doc(db, MENU_COLLECTION, item.id);
            const itemSnap = await getDoc(itemRef);

            if (!itemSnap.exists()) {
                await setDoc(itemRef, {
                    ...item,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }
        }

        console.log('✅ Menu initialized with', menuItems.length, 'items');
        return { success: true };
    } catch (error) {
        console.error('Error initializing menu:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all menu items
 */
export const getAllMenuItems = async () => {
    try {
        const menuRef = collection(db, MENU_COLLECTION);
        const snapshot = await getDocs(menuRef);

        const items = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        return { success: true, items };
    } catch (error) {
        console.error('Error getting menu items:', error);
        return { success: false, error: error.message, items: [] };
    }
};

/**
 * Get menu items by category
 */
export const getMenuByCategory = async (categoryId) => {
    try {
        const menuRef = collection(db, MENU_COLLECTION);
        const q = query(menuRef, where('category', '==', categoryId));
        const snapshot = await getDocs(q);

        const items = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        return { success: true, items };
    } catch (error) {
        console.error('Error getting menu by category:', error);
        return { success: false, error: error.message, items: [] };
    }
};

/**
 * Search menu items
 */
export const searchMenu = async (searchTerm) => {
    try {
        const menuRef = collection(db, MENU_COLLECTION);
        const snapshot = await getDocs(menuRef);

        const searchLower = searchTerm.toLowerCase();
        const items = snapshot.docs
            .map(doc => ({ ...doc.data(), id: doc.id }))
            .filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                (item.description && item.description.toLowerCase().includes(searchLower))
            );

        return { success: true, items };
    } catch (error) {
        console.error('Error searching menu:', error);
        return { success: false, error: error.message, items: [] };
    }
};

/**
 * Subscribe to all menu items (realtime)
 */
export const subscribeToMenu = (callback) => {
    try {
        const menuRef = collection(db, MENU_COLLECTION);

        const unsubscribe = onSnapshot(menuRef, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            callback({ success: true, items });
        }, (error) => {
            console.error('Error in menu subscription:', error);
            callback({ success: false, error: error.message, items: [] });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to menu:', error);
        return () => { };
    }
};

/**
 * Add menu item
 */
export const addMenuItem = async (itemData) => {
    try {
        const itemId = itemData.name.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]+/g, '-');

        const itemRef = doc(db, MENU_COLLECTION, itemId);

        await setDoc(itemRef, {
            ...itemData,
            id: itemId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error adding menu item:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update menu item
 */
export const updateMenuItem = async (itemId, updates) => {
    try {
        const itemRef = doc(db, MENU_COLLECTION, itemId);

        await updateDoc(itemRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating menu item:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete menu item
 */
export const deleteMenuItem = async (itemId) => {
    try {
        const itemRef = doc(db, MENU_COLLECTION, itemId);
        await deleteDoc(itemRef);

        return { success: true };
    } catch (error) {
        console.error('Error deleting menu item:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Toggle menu item availability
 */
export const toggleMenuItemAvailability = async (itemId, available) => {
    try {
        const itemRef = doc(db, MENU_COLLECTION, itemId);

        await updateDoc(itemRef, {
            available,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error toggling availability:', error);
        return { success: false, error: error.message };
    }
};
