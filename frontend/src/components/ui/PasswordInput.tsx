import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

interface PasswordInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    showStrengthIndicator?: boolean;
    confirmPassword?: string;
    className?: string;
}

interface PasswordStrength {
    score: number;
    feedback: string[];
    color: string;
    label: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
    value,
    onChange,
    placeholder = "Enter password",
    required = false,
    disabled = false,
    showStrengthIndicator = false,
    confirmPassword,
    className = ""
}) => {
    const { isDark } = useTheme();
    const [showPassword, setShowPassword] = useState(false);

    const getPasswordStrength = (password: string): PasswordStrength => {
        let score = 0;
        const feedback: string[] = [];

        if (password.length >= 8) {
            score += 1;
        } else {
            feedback.push("At least 8 characters");
        }

        if (password.match(/[a-z]/)) {
            score += 1;
        } else {
            feedback.push("Include lowercase letters");
        }

        if (password.match(/[A-Z]/)) {
            score += 1;
        } else {
            feedback.push("Include uppercase letters");
        }

        if (password.match(/[0-9]/)) {
            score += 1;
        } else {
            feedback.push("Include numbers");
        }

        if (password.match(/[^a-zA-Z0-9]/)) {
            score += 1;
        } else {
            feedback.push("Include special characters");
        }

        const strengthMap = {
            0: { color: '#EF4444', label: 'Very Weak' },
            1: { color: '#F97316', label: 'Weak' },
            2: { color: '#F59E0B', label: 'Fair' },
            3: { color: '#EAB308', label: 'Good' },
            4: { color: '#22C55E', label: 'Strong' },
            5: { color: '#16A34A', label: 'Very Strong' }
        };

        const strength = strengthMap[score as keyof typeof strengthMap];

        return {
            score,
            feedback,
            color: strength.color,
            label: strength.label
        };
    };

    const strength = getPasswordStrength(value);
    const passwordsMatch = confirmPassword !== undefined && value === confirmPassword && value.length > 0;
    const passwordsDontMatch = confirmPassword !== undefined && value !== confirmPassword && confirmPassword.length > 0;

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className={`
                        w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-300
                        ${isDark
                            ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        }
                        focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${passwordsDontMatch ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20' : ''}
                        ${passwordsMatch ? 'border-green-400 focus:border-green-400 focus:ring-green-500/20' : ''}
                    `}
                />

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

                {/* Password match indicator */}
                {confirmPassword !== undefined && value.length > 0 && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                        {passwordsMatch ? (
                            <Check className="w-5 h-5 text-green-500" />
                        ) : passwordsDontMatch ? (
                            <X className="w-5 h-5 text-red-500" />
                        ) : null}
                    </div>
                )}
            </div>

            {/* Password strength indicator */}
            {showStrengthIndicator && value.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Password Strength
                        </span>
                        <span
                            className="text-sm font-medium"
                            style={{ color: strength.color }}
                        >
                            {strength.label}
                        </span>
                    </div>

                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${(strength.score / 5) * 100}%`,
                                backgroundColor: strength.color
                            }}
                        />
                    </div>

                    {strength.feedback.length > 0 && (
                        <div className="space-y-1">
                            {strength.feedback.map((item, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                >
                                    <X className="w-3 h-3 text-red-400" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Password confirmation feedback */}
            {confirmPassword !== undefined && (
                <div className="space-y-1">
                    {passwordsMatch && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                            <Check className="w-3 h-3" />
                            Passwords match
                        </div>
                    )}
                    {passwordsDontMatch && (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                            <X className="w-3 h-3" />
                            Passwords don't match
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PasswordInput;