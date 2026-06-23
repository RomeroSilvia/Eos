export type AppNotificationKind = 'streak' | 'routine-morning' | 'routine-evening' | 'product-reminder' | 'routine-assigned' | 'new-message' | 'chat';

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};
