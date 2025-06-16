import React, { useEffect, useState } from 'react';
import { XCircle, AlertTriangle, CheckCircle, X, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
    message: string;
    type?: NotificationType;
    duration?: number;
    onClose?: () => void;
}

interface NotificationStyles {
    container: string;
    icon: React.ReactNode;
}

const NotificationContext = React.createContext<{
    showNotification: (props: NotificationProps) => void;
    hideNotification: () => void;
}>({
    showNotification: () => { },
    hideNotification: () => { },
});

const getStyles = (type: NotificationType): NotificationStyles => {
    switch (type) {
        case 'success':
            return {
                container: 'bg-green-50 border-green-500 text-green-800',
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            };
        case 'error':
            return {
                container: 'bg-red-50 border-red-500 text-red-800',
                icon: <XCircle className="h-5 w-5 text-red-500" />,
            };
        case 'warning':
            return {
                container: 'bg-yellow-50 border-yellow-500 text-yellow-800',
                icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            };
        case 'info':
        default:
            return {
                container: 'bg-blue-50 border-blue-500 text-blue-800',
                icon: <Info className="h-5 w-5 text-blue-500" />,
            };
    }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [notification, setNotification] = useState<NotificationProps | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const showNotification = (props: NotificationProps) => {
        setNotification(props);
        setIsVisible(true);
    };

    const hideNotification = () => {
        setIsVisible(false);
        setTimeout(() => {
            setNotification(null);
        }, 300); // Allow animation to complete
    };

    useEffect(() => {
        if (notification && isVisible) {
            const timer = setTimeout(() => {
                hideNotification();
            }, notification.duration || 3000);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [notification, isVisible]);

    return (
        <NotificationContext.Provider value={{ showNotification, hideNotification }}>
            {children}
            {notification && (
                <div
                    className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                        }`}
                >
                    <div
                        className={`flex items-center p-4 rounded-md shadow-md border-l-4 max-w-md ${getStyles(notification.type || 'info').container
                            }`}
                    >
                        <div className="mr-3">
                            {getStyles(notification.type || 'info').icon}
                        </div>
                        <div className="flex-1 mr-2">
                            <p className="text-sm font-medium">{notification.message}</p>
                        </div>
                        <button
                            onClick={hideNotification}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = React.useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}; 