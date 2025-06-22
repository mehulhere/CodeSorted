'use client';

import React, { ReactNode } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glow?: boolean;
    gradient?: boolean;
    padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
    onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hover = true,
    glow = false,
    gradient = false,
    padding = 'md',
    onClick,
}) => {
    const { isDark } = useTheme();

    const paddingClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
        none: 'p-0',
    };

    const paddingClass = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
        none: 'p-0',
    }[padding];

    return (
        <div
            className={`
        relative rounded-xl backdrop-blur-lg border transition-all duration-300
        ${isDark
                    ? 'bg-black/60 border-gray-800/70'
                    : 'bg-white/30 border-white/20'
                }
        ${hover
                    ? isDark
                        ? 'hover:bg-black/80 hover:border-gray-700/70'
                        : 'hover:bg-white/50 hover:border-white/30'
                    : ''
                }
        ${glow
                    ? isDark
                        ? 'shadow-2xl shadow-blue-500/10'
                        : 'shadow-2xl shadow-blue-500/10'
                    : 'shadow-lg'
                }
        ${paddingClass}
        ${className}
      `}
            onClick={onClick}
        >
            {gradient && (
                <div
                    className={`
            absolute inset-0 rounded-xl opacity-5
            bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
          `}
                />
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
};

export default GlassCard;