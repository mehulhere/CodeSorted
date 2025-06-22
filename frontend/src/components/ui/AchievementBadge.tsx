import React from 'react';
import { Trophy, Star, Zap, Target, Award, Crown, Flame, Shield, Gem, Rocket } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    progress?: number;
    maxProgress?: number;
    unlocked: boolean;
    unlockedAt?: string;
}

interface AchievementBadgeProps {
    achievement: Achievement;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
    achievement,
    size = 'md',
    onClick
}) => {
    const { isDark } = useTheme();

    const getIcon = (iconName: string) => {
        const icons = {
            trophy: Trophy,
            star: Star,
            zap: Zap,
            target: Target,
            award: Award,
            crown: Crown,
            flame: Flame,
            shield: Shield,
            gem: Gem,
            rocket: Rocket
        };
        return icons[iconName as keyof typeof icons] || Trophy;
    };

    const getRarityConfig = (rarity: Achievement['rarity']) => {
        const configs = {
            common: {
                border: 'border-gray-300',
                bg: isDark ? 'bg-gray-800' : 'bg-gray-50',
                shadow: 'shadow-sm',
                glow: '',
                text: isDark ? 'text-gray-300' : 'text-gray-700'
            },
            rare: {
                border: 'border-blue-400',
                bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
                shadow: 'shadow-md shadow-blue-200/50',
                glow: achievement.unlocked ? 'ring-2 ring-blue-400/30' : '',
                text: isDark ? 'text-blue-300' : 'text-blue-700'
            },
            epic: {
                border: 'border-purple-400',
                bg: isDark ? 'bg-purple-900/20' : 'bg-purple-50',
                shadow: 'shadow-lg shadow-purple-200/50',
                glow: achievement.unlocked ? 'ring-2 ring-purple-400/30' : '',
                text: isDark ? 'text-purple-300' : 'text-purple-700'
            },
            legendary: {
                border: 'border-yellow-400',
                bg: isDark ? 'bg-yellow-900/20' : 'bg-yellow-50',
                shadow: 'shadow-xl shadow-yellow-200/50',
                glow: achievement.unlocked ? 'ring-2 ring-yellow-400/30 animate-pulse' : '',
                text: isDark ? 'text-yellow-300' : 'text-yellow-700'
            }
        };
        return configs[rarity];
    };

    const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
        const configs = {
            sm: {
                container: 'w-16 h-16',
                icon: 'w-6 h-6',
                title: 'text-xs',
                description: 'text-xs'
            },
            md: {
                container: 'w-20 h-20',
                icon: 'w-8 h-8',
                title: 'text-sm',
                description: 'text-xs'
            },
            lg: {
                container: 'w-24 h-24',
                icon: 'w-10 h-10',
                title: 'text-base',
                description: 'text-sm'
            }
        };
        return configs[size];
    };

    const Icon = getIcon(achievement.icon);
    const rarityConfig = getRarityConfig(achievement.rarity);
    const sizeConfig = getSizeConfig(size);

    return (
        <div
            className={`relative group ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            {/* Badge Container */}
            <div
                className={`
                    relative rounded-xl border-2 p-3 transition-all duration-300
                    ${rarityConfig.border} ${rarityConfig.bg} ${rarityConfig.shadow} ${rarityConfig.glow}
                    ${sizeConfig.container}
                    ${achievement.unlocked ? 'hover:scale-105' : 'grayscale opacity-50'}
                    ${onClick ? 'hover:shadow-lg' : ''}
                `}
            >
                {/* Background Pattern for Legendary */}
                {achievement.rarity === 'legendary' && achievement.unlocked && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-200/20 to-orange-200/20 animate-pulse" />
                )}

                {/* Icon */}
                <div className="flex items-center justify-center h-full">
                    <Icon
                        className={`${sizeConfig.icon} ${rarityConfig.text} ${achievement.unlocked ? '' : 'opacity-50'}`}
                        style={{ color: achievement.unlocked ? achievement.color : undefined }}
                    />
                </div>

                {/* Progress Bar (if applicable) */}
                {achievement.progress !== undefined && achievement.maxProgress && (
                    <div className="absolute bottom-1 left-1 right-1">
                        <div className={`h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                                className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Unlock Animation */}
                {achievement.unlocked && (
                    <div className="absolute inset-0 rounded-xl pointer-events-none">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                <div className={`
                    px-3 py-2 rounded-lg shadow-lg border max-w-xs
                    ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}
                `}>
                    <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" style={{ color: achievement.color }} />
                        <span className={`font-semibold ${sizeConfig.title}`}>
                            {achievement.title}
                        </span>
                    </div>
                    <p className={`${sizeConfig.description} ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {achievement.description}
                    </p>
                    {achievement.progress !== undefined && achievement.maxProgress && (
                        <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <div className={`h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div
                                    className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                    style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {achievement.unlockedAt && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface AchievementGridProps {
    achievements: Achievement[];
    className?: string;
}

const AchievementGrid: React.FC<AchievementGridProps> = ({ achievements, className = '' }) => {
    const { isDark } = useTheme();

    return (
        <div className={`${className}`}>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {achievements.map((achievement) => (
                    <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        size="md"
                    />
                ))}
            </div>

            {/* Achievement Stats */}
            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <div className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {achievements.filter(a => a.unlocked).length}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Unlocked
                        </div>
                    </div>
                    <div>
                        <div className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {achievements.length}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Total
                        </div>
                    </div>
                    <div>
                        <div className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            {achievements.filter(a => a.unlocked && a.rarity === 'legendary').length}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Legendary
                        </div>
                    </div>
                    <div>
                        <div className={`text-lg font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            {achievements.filter(a => a.unlocked).length > 0 ?
                                Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100) : 0}%
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Completion
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { AchievementBadge, AchievementGrid };
export type { Achievement };