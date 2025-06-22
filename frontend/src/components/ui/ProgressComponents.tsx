import React from 'react';
import { useTheme } from '@/providers/ThemeProvider';

interface ProgressRingProps {
    progress: number;
    total: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    showLabel?: boolean;
    label?: string;
    className?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
    progress,
    total,
    size = 120,
    strokeWidth = 8,
    color = '#3B82F6',
    backgroundColor,
    showLabel = true,
    label,
    className = ''
}) => {
    const { isDark } = useTheme();
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = total > 0 ? (progress / total) * 100 : 0;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const defaultBgColor = backgroundColor || (isDark ? '#374151' : '#E5E7EB');

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={defaultBgColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))'
                    }}
                />
            </svg>

            {/* Center content */}
            {showLabel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {progress}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {label || `of ${total}`}
                    </div>
                </div>
            )}
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    color?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    progress?: {
        current: number;
        total: number;
    };
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    color = '#3B82F6',
    trend,
    progress,
    className = ''
}) => {
    const { isDark } = useTheme();

    return (
        <div className={`
            relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-xl
            ${isDark ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'}
            ${className}
        `}>
            {/* Background gradient */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    background: `linear-gradient(135deg, ${color}20 0%, transparent 70%)`
                }}
            />

            <div className="relative p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            {icon && (
                                <div
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: `${color}20` }}
                                >
                                    <div style={{ color }}>{icon}</div>
                                </div>
                            )}
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {title}
                            </span>
                        </div>

                        <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {value}
                        </div>

                        {subtitle && (
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {subtitle}
                            </div>
                        )}

                        {trend && (
                            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                                }`}>
                                <span>{trend.isPositive ? '↗' : '↘'}</span>
                                <span>{Math.abs(trend.value)}%</span>
                            </div>
                        )}
                    </div>

                    {progress && (
                        <ProgressRing
                            progress={progress.current}
                            total={progress.total}
                            size={60}
                            strokeWidth={4}
                            color={color}
                            showLabel={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

interface DifficultyProgressProps {
    easy: { solved: number; total: number };
    medium: { solved: number; total: number };
    hard: { solved: number; total: number };
    className?: string;
}

const DifficultyProgress: React.FC<DifficultyProgressProps> = ({
    easy,
    medium,
    hard,
    className = ''
}) => {
    const { isDark } = useTheme();

    const difficulties = [
        { name: 'Easy', color: '#10B981', ...easy },
        { name: 'Medium', color: '#F59E0B', ...medium },
        { name: 'Hard', color: '#EF4444', ...hard }
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {difficulties.map((difficulty) => (
                <div key={difficulty.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {difficulty.name}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {difficulty.solved}/{difficulty.total}
                        </span>
                    </div>

                    <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                            style={{
                                backgroundColor: difficulty.color,
                                width: `${difficulty.total > 0 ? (difficulty.solved / difficulty.total) * 100 : 0}%`
                            }}
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                        </div>
                    </div>

                    <div className="text-right">
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {difficulty.total > 0 ? Math.round((difficulty.solved / difficulty.total) * 100) : 0}% completed
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export { ProgressRing, StatCard, DifficultyProgress };