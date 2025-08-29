import React, { useEffect, useState } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import { errorService, ErrorNotification } from '../services/errorService';

interface NotificationToastProps {
  className?: string;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  useEffect(() => {
    const unsubscribe = errorService.subscribe(() => {
      setNotifications(errorService.getNotifications());
    });

    // Set initial notifications
    setNotifications(errorService.getNotifications());

    return unsubscribe;
  }, []);

  const handleRemove = (id: string) => {
    errorService.removeNotification(id);
  };

  const getIcon = (type: ErrorNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-400" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getBackgroundColor = (type: ErrorNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (type: ErrorNotification['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            flex items-start p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out
            ${getBackgroundColor(notification.type)}
            animate-in slide-in-from-right-full
          `}
        >
          <div className="flex-shrink-0 mr-3 mt-0.5">
            {getIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium ${getTextColor(notification.type)}`}>
              {notification.title}
            </h4>
            <p className={`mt-1 text-sm ${getTextColor(notification.type)} opacity-90`}>
              {notification.message}
            </p>
            
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          
          <button
            onClick={() => handleRemove(notification.id)}
            className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast; 