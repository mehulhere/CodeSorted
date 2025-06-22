'use client';

import React from 'react';
import { useTheme } from '@/providers/ThemeProvider';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
    animation?: 'pulse' | 'wave' | 'none';
    lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    animation = 'pulse',
    lines = 1,
}) => {
    const { isDark } = useTheme();

    const baseClasses = `
    ${isDark ? 'bg-gray-700' : 'bg-gray-200'}
    ${animation === 'pulse' ? 'animate-pulse' : ''}
    ${animation === 'wave' ? 'animate-shimmer' : ''}
  `;

    const variantClasses = {
        text: 'h-4 rounded',
        rectangular: 'rounded-lg',
        circular: 'rounded-full',
        rounded: 'rounded-xl',
    };

    if (variant === 'text' && lines > 1) {
        return (
            <div className={`space-y-2 ${className}`}>
                {Array.from({ length: lines }).map((_, index) => (
                    <div
                        key={index}
                        className={`
              ${baseClasses}
              ${variantClasses[variant]}
              ${index === lines - 1 ? 'w-3/4' : 'w-full'}
            `}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${className}
      `}
        />
    );
};

// Preset skeleton components
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`space-y-4 ${className}`}>
        <Skeleton variant="rectangular" className="h-48" />
        <Skeleton variant="text" lines={3} />
    </div>
);

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    return <Skeleton variant="circular" className={sizeClasses[size]} />;
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
    rows = 5,
    cols = 4
}) => (
    <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {Array.from({ length: cols }).map((_, colIndex) => (
                    <Skeleton key={colIndex} variant="text" className="h-6" />
                ))}
            </div>
        ))}
    </div>
);

export default Skeleton;