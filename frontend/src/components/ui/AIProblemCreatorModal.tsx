import React from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Sparkles, Target } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

interface AIProblemCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AIProblemCreatorModal: React.FC<AIProblemCreatorModalProps> = ({ isOpen, onClose }) => {
    const { isDark } = useTheme();
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative ${isCollapsed ? 'w-96' : 'w-full max-w-2xl'} 
                   bg-gradient-to-br ${isDark
                        ? 'from-gray-950 to-gray-900'
                        : 'from-gray-50 to-white'} 
                   rounded-xl shadow-xl overflow-hidden transition-all duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background visual elements */}
                <div className="absolute inset-0 overflow-hidden">
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${isDark
                        ? 'from-blue-600 via-purple-600 to-pink-600'
                        : 'from-blue-400 via-purple-400 to-pink-400'
                        }`} />

                    {/* Static sparkles pattern */}
                    <div className="absolute inset-0">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={i}
                                className={`absolute ${isDark ? 'text-blue-400/30' : 'text-blue-500/40'}`}
                                style={{
                                    left: `${10 + (i * 4.5)}%`,
                                    top: `${15 + ((i % 4) * 20)}%`,
                                    transform: `rotate(${i * 18}deg)`
                                }}
                            >
                                <Sparkles className="w-3 h-3" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal Content */}
                <div className="relative z-10">
                    {/* Header */}
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                            <Sparkles className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                            <h2 className={`text-2xl font-bold bg-gradient-to-r ${isDark
                                ? 'from-blue-400 via-purple-400 to-pink-400'
                                : 'from-blue-600 via-purple-600 to-pink-600'
                                } bg-clip-text text-transparent`}>
                                AI-Powered Problem Creator
                            </h2>
                            <Sparkles className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        </div>

                        {!isCollapsed && (
                            <p className={`mt-2 text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Transform your ideas into professional coding challenges
                            </p>
                        )}
                    </div>

                    {/* Toggle button - uses expand/collapse instead of X */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-200 ${isDark
                            ? 'bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white'
                            : 'bg-gray-200/50 hover:bg-gray-300 text-gray-600 hover:text-gray-900'
                            } backdrop-blur-sm`}
                        aria-label={isCollapsed ? "Expand modal" : "Collapse modal"}
                    >
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>

                    {/* Modal Body - Only shown when expanded */}
                    {!isCollapsed && (
                        <div className="p-6 pt-0">
                            <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                {[
                                    { icon: Lightbulb, label: 'AI Analysis', desc: 'Smart formatting' },
                                    { icon: Target, label: 'Auto Test Cases', desc: 'Generated automatically' },
                                    { icon: Sparkles, label: 'Professional', desc: 'Ready to publish' }
                                ].map((feature, index) => (
                                    <div key={index} className={`p-4 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                                        <feature.icon className={`w-6 h-6 mx-auto mb-2 ${index === 0 ? 'text-yellow-500' :
                                            index === 1 ? 'text-blue-500' :
                                                'text-purple-500'
                                            }`} />
                                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {feature.label}
                                        </div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {feature.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                                >
                                    Get Started
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIProblemCreatorModal; 