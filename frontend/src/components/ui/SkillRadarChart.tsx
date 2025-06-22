import React from 'react';
import { useTheme } from '@/providers/ThemeProvider';

interface RadarChartProps {
    data: {
        skill: string;
        level: number;
        maxLevel?: number;
    }[];
    size?: number;
    className?: string;
}

const SkillRadarChart: React.FC<RadarChartProps> = ({
    data,
    size = 200,
    className = ''
}) => {
    const { isDark } = useTheme();
    const center = size / 2;
    const radius = size * 0.35;
    const levels = 5;

    // Calculate points for each skill
    const calculatePoint = (angle: number, level: number, maxLevel: number = 5) => {
        const normalizedLevel = (level / maxLevel) * radius;
        const x = center + normalizedLevel * Math.cos(angle - Math.PI / 2);
        const y = center + normalizedLevel * Math.sin(angle - Math.PI / 2);
        return { x, y };
    };

    // Generate skill points
    const skillPoints = data.map((item, index) => {
        const angle = (index * 2 * Math.PI) / data.length;
        return {
            ...item,
            ...calculatePoint(angle, item.level, item.maxLevel || 5),
            angle
        };
    });

    // Create path for filled area
    const pathData = skillPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ') + ' Z';

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="overflow-visible">
                {/* Grid circles */}
                {Array.from({ length: levels }).map((_, i) => (
                    <circle
                        key={i}
                        cx={center}
                        cy={center}
                        r={(radius * (i + 1)) / levels}
                        fill="none"
                        stroke={isDark ? '#374151' : '#E5E7EB'}
                        strokeWidth="1"
                        opacity={0.5}
                    />
                ))}

                {/* Grid lines */}
                {skillPoints.map((point, index) => (
                    <line
                        key={index}
                        x1={center}
                        y1={center}
                        x2={center + radius * Math.cos(point.angle - Math.PI / 2)}
                        y2={center + radius * Math.sin(point.angle - Math.PI / 2)}
                        stroke={isDark ? '#374151' : '#E5E7EB'}
                        strokeWidth="1"
                        opacity={0.5}
                    />
                ))}

                {/* Filled area */}
                <path
                    d={pathData}
                    fill="url(#radarGradient)"
                    opacity={0.3}
                    className="animate-pulse"
                />

                {/* Border line */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="url(#radarStroke)"
                    strokeWidth="2"
                />

                {/* Skill points */}
                {skillPoints.map((point, index) => (
                    <g key={index}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="url(#pointGradient)"
                            className="drop-shadow-sm"
                        />
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="2"
                            fill="white"
                        />
                    </g>
                ))}

                {/* Skill labels */}
                {skillPoints.map((point, index) => {
                    const labelRadius = radius + 25;
                    const labelX = center + labelRadius * Math.cos(point.angle - Math.PI / 2);
                    const labelY = center + labelRadius * Math.sin(point.angle - Math.PI / 2);

                    return (
                        <text
                            key={index}
                            x={labelX}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={`text-xs font-medium ${isDark ? 'fill-gray-300' : 'fill-gray-700'}`}
                        >
                            {point.skill}
                        </text>
                    );
                })}

                {/* Gradients */}
                <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                    <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="50%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#DB2777" />
                    </linearGradient>
                    <radialGradient id="pointGradient">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#1D4ED8" />
                    </radialGradient>
                </defs>
            </svg>
        </div>
    );
};

export default SkillRadarChart;