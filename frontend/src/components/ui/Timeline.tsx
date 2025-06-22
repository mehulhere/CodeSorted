import React from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Code, Zap } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

interface TimelineItem {
    id: string;
    title: string;
    subtitle?: string;
    status: 'success' | 'error' | 'warning' | 'pending' | 'running';
    timestamp: string;
    language?: string;
    executionTime?: number;
    details?: string;
    onClick?: () => void;
}

interface TimelineProps {
    items: TimelineItem[];
    className?: string;
}

const Timeline: React.FC<TimelineProps> = ({ items, className = '' }) => {
    const { isDark } = useTheme();

    const getStatusConfig = (status: TimelineItem['status']) => {
        const configs = {
            success: {
                icon: CheckCircle,
                color: 'text-green-500',
                bgColor: isDark ? 'bg-green-900/30' : 'bg-green-50',
                borderColor: 'border-green-500',
                dotColor: 'bg-green-500'
            },
            error: {
                icon: XCircle,
                color: 'text-red-500',
                bgColor: isDark ? 'bg-red-900/30' : 'bg-red-50',
                borderColor: 'border-red-500',
                dotColor: 'bg-red-500'
            },
            warning: {
                icon: AlertTriangle,
                color: 'text-yellow-500',
                bgColor: isDark ? 'bg-yellow-900/30' : 'bg-yellow-50',
                borderColor: 'border-yellow-500',
                dotColor: 'bg-yellow-500'
            },
            pending: {
                icon: Clock,
                color: 'text-blue-500',
                bgColor: isDark ? 'bg-blue-900/30' : 'bg-blue-50',
                borderColor: 'border-blue-500',
                dotColor: 'bg-blue-500'
            },
            running: {
                icon: Zap,
                color: 'text-purple-500',
                bgColor: isDark ? 'bg-purple-900/30' : 'bg-purple-50',
                borderColor: 'border-purple-500',
                dotColor: 'bg-purple-500 animate-pulse'
            }
        };
        return configs[status];
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    return (
        <div className={`relative ${className}`}>
            {/* Timeline line */}
            <div className={`absolute left-4 top-0 bottom-0 w-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

            <div className="space-y-6">
                {items.map((item, index) => {
                    const config = getStatusConfig(item.status);
                    const Icon = config.icon;

                    return (
                        <div
                            key={item.id}
                            className={`relative flex items-start group ${item.onClick ? 'cursor-pointer' : ''}`}
                            onClick={item.onClick}
                        >
                            {/* Status dot */}
                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${config.borderColor} ${config.bgColor} transition-all duration-300`}>
                                <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>

                            {/* Content */}
                            <div className={`ml-4 flex-1 min-w-0 pb-6 ${item.onClick ? 'group-hover:translate-x-0.5' : ''} transition-transform duration-300`}>
                                <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} hover:shadow-lg transition-all duration-300`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {item.title}
                                        </h3>
                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {formatTime(item.timestamp)}
                                        </span>
                                    </div>

                                    {item.subtitle && (
                                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                                            {item.subtitle}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-4 text-xs">
                                        {item.language && (
                                            <div className="flex items-center gap-1">
                                                <Code className="w-3 h-3" />
                                                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                                    {item.language}
                                                </span>
                                            </div>
                                        )}

                                        {item.executionTime && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                                    {item.executionTime}ms
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {item.details && (
                                        <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {item.details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Timeline;