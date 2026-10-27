import { request } from './api';

export const notificationService = {
  async getNotifications() {
    const response = await request('/notifications');
    const notifications = Array.isArray(response) ? response : response?.notifications;
    if (!Array.isArray(notifications)) {
      throw new Error('The notifications service returned an invalid response.');
    }
    return notifications.map((notification) => ({
      ...notification,
      isRead: Boolean(notification.isRead ?? notification.read),
      date: notification.date || notification.createdAt,
    }));
  },

  async markAsRead(id) {
    return request(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllAsRead() {
    return request('/notifications/read-all', { method: 'PATCH' });
  },
};
