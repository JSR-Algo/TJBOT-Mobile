export interface OrderParams {
  productId: string;
  quantity: number;
  shippingAddressId: string;
}

export interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  productId: string;
  totalCents: number;
}

export interface PaymentParams {
  orderId: string;
  paymentMethodToken: string;
}

export interface ShippingStatus {
  orderId: string;
  status: string;
  estimatedDelivery: string | null;
  trackingNumber: string | null;
}

export async function createOrder(_params: OrderParams): Promise<Order> {
  throw new Error('not implemented');
}

export async function getOrder(_orderId: string): Promise<Order> {
  throw new Error('not implemented');
}

export async function processPayment(_params: PaymentParams): Promise<{ success: boolean }> {
  throw new Error('not implemented');
}

export async function getShippingStatus(_orderId: string): Promise<ShippingStatus> {
  throw new Error('not implemented');
}

export async function activateRobot(_deviceId: string): Promise<void> {
  throw new Error('not implemented');
}
