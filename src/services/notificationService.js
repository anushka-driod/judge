import { request } from './api';
import { mockNotifications } from '../data/mockData';

let localNotifications = [...mockNotifications];

export const notificationService = {
  async getNotifications() {
    return request('/notifications', {}, () => [...localNotifications]);
  },

  async markAsRead(id) {
    return request(`/notifications/${id}/read`, { method: 'PATCH' }, () => {
      localNotifications = localNotifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return { success: true };
    });
  },

  async markAllAsRead() {
    return request('/notifications/read-all', { method: 'PATCH' }, () => {
      localNotifications = localNotifications.map((n) => ({ ...n, isRead: true }));
      return { success: true };
    });
  },
};
