import React from 'react';
import { Github, Chrome, Facebook, Zap } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import AnimatedButton from './AnimatedButton';

interface SocialLoginProps {
    onSocialLogin: (provider: string) => void;
    onGuestLogin?: () => void;
    isGuestLoading?: boolean;
    disabled?: boolean;
    className?: string;
}

const SocialLogin: React.FC<SocialLoginProps> = ({
    onSocialLogin,
    onGuestLogin,
    isGuestLoading = false,
    disabled = false,
    className = ""
}) => {
    const { isDark } = useTheme();

    const socialProviders = [
        {
            name: 'google',
            label: 'Google',
            icon: Chrome,
            color: '#4285F4',
            hoverColor: '#3367D6'
        },
        {
            name: 'github',
            label: 'GitHub',
            icon: Github,
            color: isDark ? '#f0f6fc' : '#24292f',
            hoverColor: isDark ? '#c9d1d9' : '#1c2128'
        },
        {
            name: 'facebook',
            label: 'Facebook',
            icon: Facebook,
            color: '#1877F2',
            hoverColor: '#166FE5'
        }
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Divider */}
            <div className="relative">
                <div className={`absolute inset-0 flex items-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    <div className={`w-full border-t ${isDark ? 'border-gray-700' : 'border-gray-300'}`} />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className={`px-4 ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'}`}>
                        Or continue with
                    </span>
                </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-3 gap-3">
                {socialProviders.map((provider) => {
                    const Icon = provider.icon;
                    return (
                        <button
                            key={provider.name}
                            onClick={() => onSocialLogin(provider.name)}
                            disabled={disabled}
                            className={`
                                group relative overflow-hidden p-3 rounded-lg border transition-all duration-300
                                ${isDark
                                    ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                                    : 'bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                }
                                focus:outline-none focus:ring-2 focus:ring-blue-500/20
                                disabled:opacity-50 disabled:cursor-not-allowed
                                hover:scale-105 hover:shadow-lg
                            `}
                            style={{
                                '--hover-color': provider.hoverColor
                            } as React.CSSProperties}
                        >
                            {/* Background gradient on hover */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                                style={{ backgroundColor: provider.color }}
                            />

                            <div className="relative flex items-center justify-center">
                                <Icon
                                    className="w-5 h-5 transition-colors duration-300"
                                    style={{
                                        color: provider.color,
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                    }}
                                />
                            </div>

                            {/* Hover effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        </button>
                    );
                })}
            </div>

            {/* Guest Login */}
            {onGuestLogin && (
                <div className="space-y-2">
                    <AnimatedButton
                        onClick={onGuestLogin}
                        disabled={isGuestLoading || disabled}
                        variant="ghost"
                        icon={Zap}
                        loading={isGuestLoading}
                        className="w-full"
                    >
                        {isGuestLoading ? 'Creating Guest Account...' : 'Continue as Guest'}
                    </AnimatedButton>

                    <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Limited to 3 guest accounts per hour per IP address
                    </p>
                </div>
            )}
        </div>
    );
};

export default SocialLogin;