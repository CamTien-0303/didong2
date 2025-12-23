// Types cho Smart Order App

export type TableStatus = 'TRONG' | 'CO_KHACH' | 'DA_DAT';

export type OrderItemStatus = 'DANG_LAM' | 'DA_PHUC_VU';

export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  capacity: number; // Số ghế
  currentOrderId?: string; // ID của order hiện tại
  reservedTime?: string; // Thời gian đặt bàn (nếu status = DA_DAT)
  reservedName?: string; // Tên người đặt (nếu status = DA_DAT)
  createdAt: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  price: number;
  status: OrderItemStatus;
  note?: string;
}

export interface Order {
  id: string;
  tableId: string;
  tableName: string;
  items: OrderItem[];
  total: number;
  createdAt: number;
  servedAt?: number;
  paidAt?: number;
}

