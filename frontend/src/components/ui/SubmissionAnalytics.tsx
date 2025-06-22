import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

interface ChartData {
    label: string;
    value: number;
    color: string;
    percentage?: number;
}

interface SubmissionAnalyticsProps {
    data: ChartData[];
    title: string;
    totalSubmissions: number;
    className?: string;
}

const SubmissionAnalytics: React.FC<SubmissionAnalyticsProps> = ({ 
    data, 
    title, 
    totalSubmissions, 
    className = '' 
}) => {
    const { isDark } = useTheme();

    const maxValue = Math.max(...data.map(item => item.value));

    return (
        <div className={`${className}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Total: {totalSubmissions.toLocaleString()} submissions
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={item.label} className="group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {item.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {item.value.toLocaleString()}
                                </span>
                                {item.percentage !== undefined && (
                                    <div className="flex items-center gap-1">
                                        {item.percentage > 0 ? (
                                            <TrendingUp className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3 text-red-500" />
                                        )}
                                        <span className={`text-xs ${item.percentage > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {Math.abs(item.percentage)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className={`relative h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                                className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out group-hover:scale-105"
                                style={{ 
                                    backgroundColor: item.color,
                                    width: `${(item.value / maxValue) * 100}%`,
                                    transformOrigin: 'left center'
                                }}
                            />
                            {/* Shimmer effect */}
                            <div 
                                className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                                style={{ 
                                    width: `${(item.value / maxValue) * 100}%`,
                                    animationDelay: `${index * 0.2}s`
                                }}
                            />
                        </div>
                        
                        <div className="mt-1 text-right">
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {totalSubmissions > 0 ? ((item.value / totalSubmissions) * 100).toFixed(1) : '0.0'}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary stats */}
            <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {data.find(item => item.label.toLowerCase().includes('accepted'))?.value || 0}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Accepted
                        </div>
                    </div>
                    <div>
                        <div className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                            {totalSubmissions - (data.find(item => item.label.toLowerCase().includes('accepted'))?.value || 0)}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Failed
                        </div>
                    </div>
                    <div>
                        <div className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {totalSubmissions > 0 ? (((data.find(item => item.label.toLowerCase().includes('accepted'))?.value || 0) / totalSubmissions) * 100).toFixed(1) : '0.0'}%
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Success Rate
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionAnalytics;