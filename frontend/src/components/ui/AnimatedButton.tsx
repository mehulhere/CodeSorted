'use client';

import React, { ReactNode } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { LucideIcon } from 'lucide-react';

interface AnimatedButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    glow?: boolean;
    gradient?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    className = '',
    onClick,
    href,
    type = 'button',
    glow = false,
    gradient = false,
}) => {
    const { isDark } = useTheme();

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
    };

    const getVariantClasses = () => {
        const baseClasses = 'font-medium rounded-lg transition-all duration-300 transform active:scale-95';

        if (gradient) {
            return `${baseClasses} bg-gradient-to-r text-white shadow-lg hover:scale-105 ${variant === 'primary' ? 'from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500' :
                variant === 'success' ? 'from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400' :
                    variant === 'warning' ? 'from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400' :
                        variant === 'danger' ? 'from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400' :
                            'from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
                }`;
        }

        switch (variant) {
            case 'primary':
                return `${baseClasses} ${isDark
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
                    }`;

            case 'secondary':
                return `${baseClasses} ${isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
                    }`;

            case 'success':
                return `${baseClasses} ${isDark
                    ? 'bg-green-600 hover:bg-green-500 text-white border border-green-500'
                    : 'bg-green-600 hover:bg-green-700 text-white border border-green-600'
                    }`;

            case 'warning':
                return `${baseClasses} ${isDark
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white border border-yellow-500'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white border border-yellow-500'
                    }`;

            case 'danger':
                return `${baseClasses} ${isDark
                    ? 'bg-red-600 hover:bg-red-500 text-white border border-red-500'
                    : 'bg-red-600 hover:bg-red-700 text-white border border-red-600'
                    }`;

            case 'ghost':
                return `${baseClasses} ${isDark
                    ? 'text-gray-300 hover:bg-gray-800 border border-transparent hover:border-gray-600'
                    : 'text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-300'
                    }`;

            default:
                return baseClasses;
        }
    };

    const buttonClasses = `
    ${getVariantClasses()}
    ${sizeClasses[size]}
    ${glow ? (isDark ? 'shadow-lg shadow-blue-500/25' : 'shadow-lg shadow-blue-500/15') : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed transform-none' : 'cursor-pointer'}
    ${className}
    flex items-center justify-center gap-2 relative overflow-hidden group
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  `;

    const content = (
        <>
            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

            {/* Loading spinner */}
            {loading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}

            {/* Icon and text content */}
            <div className="flex items-center gap-2 relative z-10">
                {Icon && iconPosition === 'left' && !loading && (
                    <Icon className={`transition-transform duration-300 group-hover:scale-110 ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : size === 'xl' ? 'w-7 h-7' : 'w-5 h-5'
                        }`} />
                )}

                <span className={loading ? 'opacity-0' : 'opacity-100'}>{children}</span>

                {Icon && iconPosition === 'right' && !loading && (
                    <Icon className={`transition-transform duration-300 group-hover:translate-x-1 ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : size === 'xl' ? 'w-7 h-7' : 'w-5 h-5'
                        }`} />
                )}
            </div>
        </>
    );

    if (href) {
        return (
            <a href={href} className={buttonClasses} onClick={onClick}>
                {content}
            </a>
        );
    }

    return (
        <button
            type={type}
            className={buttonClasses}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {content}
        </button>
    );
};

export default AnimatedButton;