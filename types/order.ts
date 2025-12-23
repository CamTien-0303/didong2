// Types cho Smart Order App

export type TableStatus = 'TRONG' | 'CO_KHACH' | 'DA_DAT';

export type OrderItemStatus = 'DANG_LAM' | 'DA_PHUC_VU';

export type OrderStatus = 'CHO_XAC_NHAN' | 'DANG_LAM' | 'HOAN_TAT';

export type CustomerType = 'KHACH_LE' | 'DAT_TRUOC' | 'VIP';

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
  orderCode: string; // Mã đơn hàng như #ORD-0921
  tableId: string;
  tableName: string;
  items: OrderItem[];
  total: number;
  createdAt: number;
  servedAt?: number;
  paidAt?: number;
  status?: OrderStatus; // Trạng thái đơn hàng
  customerType?: CustomerType; // Loại khách hàng
  confirmedAt?: number; // Thời gian xác nhận đơn
}

