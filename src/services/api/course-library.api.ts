export type { Order, OrderParams } from './purchase.api';
export { createOrder, getOrder } from './purchase.api';
export { pushCourseToDevice } from './device.api';

export interface LibraryItem {
  courseId: string;
  title: string;
  language: string;
  price: number;
  owned: boolean;
  syncedToDevice: boolean;
}

export interface CourseDetail {
  courseId: string;
  title: string;
  description: string;
  levelCount: number;
  lessonCount: number;
  previewUrl: string | null;
}

export interface RotjtjbotSyncStatus {
  courseId: string;
  synced: boolean;
  lastSyncAt: string | null;
}

export async function listLibrary(): Promise<LibraryItem[]> {
  throw new Error('not implemented');
}

export async function getCourseDetail(_courseId: string): Promise<CourseDetail> {
  throw new Error('not implemented');
}

export async function purchaseCourse(_courseId: string): Promise<void> {
  throw new Error('not implemented');
}

export async function unlockCourse(_courseId: string): Promise<void> {
  throw new Error('not implemented');
}

export async function sendCourseToRotjtjbot(_courseId: string): Promise<void> {
  throw new Error('not implemented');
}

export async function getRotjtjbotSyncStatus(_courseId: string): Promise<RotjtjbotSyncStatus> {
  throw new Error('not implemented');
}
