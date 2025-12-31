import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const CATEGORIES_COLLECTION = 'categories';

/**
 * Initialize default categories
 */
export const initializeCategories = async () => {
    try {
        const categories = [
            {
                id: 'mon-chinh',
                name: 'Món chính',
                icon: '🍜',
                order: 1,
            },
            {
                id: 'khai-vi',
                name: 'Khai vị',
                icon: '🥗',
                order: 2,
            },
            {
                id: 'mon-phu',
                name: 'Món phụ',
                icon: '🍲',
                order: 3,
            },
            {
                id: 'nuoc-uong',
                name: 'Nước uống',
                icon: '🥤',
                order: 4,
            },
            {
                id: 'trang-mieng',
                name: 'Tráng miệng',
                icon: '🍮',
                order: 5,
            },
            {
                id: 'combo',
                name: 'Combo',
                icon: '🎁',
                order: 6,
            },
        ];

        for (const category of categories) {
            const categoryRef = doc(db, CATEGORIES_COLLECTION, category.id);
            const categorySnap = await getDoc(categoryRef);

            if (!categorySnap.exists()) {
                await setDoc(categoryRef, {
                    ...category,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }
        }

        console.log('✅ Categories initialized');
        return { success: true };
    } catch (error) {
        console.error('Error initializing categories:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all categories
 */
export const getAllCategories = async () => {
    try {
        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const q = query(categoriesRef, orderBy('order'));
        const snapshot = await getDocs(q);

        const categories = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        return { success: true, categories };
    } catch (error) {
        console.error('Error getting categories:', error);
        return { success: false, error: error.message, categories: [] };
    }
};

/**
 * Subscribe to categories (realtime)
 */
export const subscribeToCategories = (callback) => {
    try {
        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const q = query(categoriesRef, orderBy('order'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const categories = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            callback({ success: true, categories });
        }, (error) => {
            console.error('Error in categories subscription:', error);
            callback({ success: false, error: error.message, categories: [] });
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to categories:', error);
        return () => { };
    }
};

/**
 * Add new category
 */
export const addCategory = async (categoryData) => {
    try {
        const categoryId = categoryData.name.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]+/g, '-');

        const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);

        await setDoc(categoryRef, {
            ...categoryData,
            id: categoryId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error adding category:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update category
 */
export const updateCategory = async (categoryId, updates) => {
    try {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);

        await updateDoc(categoryRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating category:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete category
 */
export const deleteCategory = async (categoryId) => {
    try {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);
        await deleteDoc(categoryRef);

        return { success: true };
    } catch (error) {
        console.error('Error deleting category:', error);
        return { success: false, error: error.message };
    }
};
