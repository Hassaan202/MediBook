import { request } from "@/lib/http";

export const notificationService = {
  getNotifications: () =>
    request("/api/notifications"),

  getUnread: () =>
    request("/api/notifications?isRead=false"),

  markAsRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: "PATCH", json: {} }),

  markAllAsRead: () =>
    request("/api/notifications/read-all", { method: "PATCH", json: {} }),

  deleteNotification: (id: string) =>
    request(`/api/notifications/${id}`, { method: "DELETE" }),
};

export default notificationService;
