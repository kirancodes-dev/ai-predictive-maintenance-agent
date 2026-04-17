import { useNotificationContext } from '../context/NotificationContext';

export const useNotification = () => {
  const { addNotification, removeNotification, notifications } = useNotificationContext();

  const success = (title: string, message?: string) =>
    addNotification({ type: 'success', title, message });

  const error = (title: string, message?: string) =>
    addNotification({ type: 'error', title, message });

  const warning = (title: string, message?: string) =>
    addNotification({ type: 'warning', title, message });

  const info = (title: string, message?: string) =>
    addNotification({ type: 'info', title, message });

  return { notifications, success, error, warning, info, remove: removeNotification };
};
