'use client';

import React, { ReactNode } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glow?: boolean;
    gradient?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hover = true,
    glow = false,
    gradient = false,
    padding = 'md',
}) => {
    const { isDark } = useTheme();

    const paddingClasses = {
        none: '',
        sm: 'p-3',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
    };

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
        ${paddingClasses[padding]}
        ${className}
      `}
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