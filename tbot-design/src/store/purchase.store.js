import { create } from 'zustand';

export const usePurchaseStore = create((set) => ({
  orderId: null,
  paymentStatus: 'idle',
  shippingStatus: null,
  startCheckout: (orderId) => set({ orderId, paymentStatus: 'pending' }),
  confirmPayment: () => set({ paymentStatus: 'confirmed' }),
  failPayment: () => set({ paymentStatus: 'failed' }),
  setShipping: (status) => set({ shippingStatus: status }),
  reset: () => set({ orderId: null, paymentStatus: 'idle', shippingStatus: null }),
}));
