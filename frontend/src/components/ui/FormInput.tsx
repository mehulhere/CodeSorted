import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, User, Mail, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

interface FormInputProps {
    label: string;
    type?: 'text' | 'email' | 'password';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    success?: boolean;
    icon?: React.ReactNode;
    validation?: (value: string) => string | null;
    className?: string;
}

const FormInput: React.FC<FormInputProps> = ({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    success = false,
    icon,
    validation,
    className = ""
}) => {
    const { isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Validate input when value changes
    useEffect(() => {
        if (validation && value) {
            setLocalError(validation(value));
        } else {
            setLocalError(null);
        }
    }, [value, validation]);

    const hasError = error || localError;
    const isValid = !hasError && value.length > 0;
    const showSuccess = success || isValid;

    const getIcon = () => {
        if (icon) return icon;
        if (type === 'email') return <Mail className="w-5 h-5" />;
        if (type === 'password') return <Eye className="w-5 h-5" />;
        return <User className="w-5 h-5" />;
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <label
                className={`
                    block text-sm font-medium transition-colors duration-200
                    ${isDark ? 'text-gray-300' : 'text-gray-700'}
                    ${isFocused ? (isDark ? 'text-blue-400' : 'text-blue-600') : ''}
                `}
            >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            <div className="relative group">
                {/* Icon */}
                <div className={`
                    absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200
                    ${hasError ? 'text-red-400' :
                        showSuccess ? 'text-green-400' :
                            isFocused ? (isDark ? 'text-blue-400' : 'text-blue-500') :
                                (isDark ? 'text-gray-500' : 'text-gray-400')
                    }
                `}>
                    {getIcon()}
                </div>

                <input
                    type={type === 'password' && showPassword ? 'text' : type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className={`
                        w-full pl-12 pr-12 py-3 rounded-lg border transition-all duration-300
                        ${isDark
                            ? 'bg-gray-800/50 text-white placeholder-gray-400'
                            : 'bg-white text-gray-900 placeholder-gray-500'
                        }
                        ${hasError
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                            : showSuccess
                                ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20'
                                : isDark
                                    ? 'border-gray-600 focus:border-blue-400 focus:ring-blue-500/20'
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                        }
                        focus:ring-2 focus:outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isFocused ? 'scale-[1.02] shadow-lg' : 'hover:shadow-md'}
                    `}
                />

                {/* Password visibility toggle */}
                {type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`
                            absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-md
                            transition-colors duration-200
                            ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20
                        `}
                        disabled={disabled}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                )}

                {/* Status icon */}
                {(hasError || showSuccess) && type !== 'password' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {hasError ? (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        ) : (
                            <Check className="w-5 h-5 text-green-400" />
                        )}
                    </div>
                )}

                {/* Focus ring animation */}
                <div className={`
                    absolute inset-0 rounded-lg pointer-events-none transition-all duration-300
                    ${isFocused ? 'ring-2 ring-blue-500/20 scale-105' : ''}
                `} />
            </div>

            {/* Error message */}
            {hasError && (
                <div className="flex items-center gap-2 text-red-600 text-sm animate-slideIn">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error || localError}
                </div>
            )}

            {/* Success message */}
            {showSuccess && !hasError && (
                <div className="flex items-center gap-2 text-green-600 text-sm animate-slideIn">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Looks good!
                </div>
            )}
        </div>
    );
};

// Validation functions
export const validateEmail = (email: string): string | null => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Please enter a valid email address';
};

export const validateUsername = (username: string): string | null => {
    if (!username) return null;
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return null;
};

export const validateName = (name: string): string | null => {
    if (!name) return null;
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > 50) return 'Name must be less than 50 characters';
    return null;
};

export default FormInput;