import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    Trophy,
    Target,
    Clock,
    TrendingUp,
    Calendar,
    Code2,
    Award,
    Zap,
    BookOpen,
    Users,
    Star,
    ArrowRight,
    PlayCircle,
    CheckCircle,
    XCircle,
    Timer,
    BarChart3,
    Activity,
    Globe,
    Medal,
    Sparkles,
    Brain,
    Coffee,
    GitBranch
} from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';

interface UserStats {
    totalSolved: number;
    totalAttempted: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    streak: number;
    rating: number;
    rank: number;
    submissions: number;
    acceptanceRate: number;
}

interface RecentSubmission {
    id: string;
    problemTitle: string;
    status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error';
    language: string;
    submittedAt: string;
    executionTime?: number;
}

interface RecentActivity {
    id: string;
    type: 'submission' | 'problem_solved' | 'achievement' | 'streak';
    message: string;
    timestamp: string;
    icon: string;
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt?: string;
    progress?: number;
    maxProgress?: number;
}

export default function Dashboard() {
    const { isDark } = useTheme();
    const router = useRouter();

    const [userStats, setUserStats] = useState<UserStats>({
        totalSolved: 0,
        totalAttempted: 0,
        easyCount: 0,
        mediumCount: 0,
        hardCount: 0,
        streak: 0,
        rating: 0,
        rank: 0,
        submissions: 0,
        acceptanceRate: 0
    });

    const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Mock data for demonstration - replace with real API calls
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Mock user data
                setUser({
                    name: 'Alex Chen',
                    username: 'alexcode',
                    joinedAt: '2024-01-15',
                    avatar: null
                });

                // Mock stats
                setUserStats({
                    totalSolved: 127,
                    totalAttempted: 185,
                    easyCount: 65,
                    mediumCount: 48,
                    hardCount: 14,
                    streak: 7,
                    rating: 1847,
                    rank: 2341,
                    submissions: 342,
                    acceptanceRate: 68.6
                });

                // Mock recent submissions
                setRecentSubmissions([
                    {
                        id: '1',
                        problemTitle: 'Two Sum',
                        status: 'Accepted',
                        language: 'Python',
                        submittedAt: '2024-01-20T10:30:00Z',
                        executionTime: 45
                    },
                    {
                        id: '2',
                        problemTitle: 'Reverse Linked List',
                        status: 'Wrong Answer',
                        language: 'JavaScript',
                        submittedAt: '2024-01-20T09:15:00Z'
                    },
                    {
                        id: '3',
                        problemTitle: 'Binary Tree Inorder',
                        status: 'Accepted',
                        language: 'Python',
                        submittedAt: '2024-01-19T16:45:00Z',
                        executionTime: 32
                    }
                ]);

                // Mock recent activity
                setRecentActivity([
                    {
                        id: '1',
                        type: 'problem_solved',
                        message: 'Solved "Two Sum" in Python',
                        timestamp: '2024-01-20T10:30:00Z',
                        icon: 'CheckCircle'
                    },
                    {
                        id: '2',
                        type: 'streak',
                        message: 'Achieved 7-day coding streak! 🔥',
                        timestamp: '2024-01-20T08:00:00Z',
                        icon: 'Fire'
                    },
                    {
                        id: '3',
                        type: 'achievement',
                        message: 'Unlocked "Problem Solver" badge',
                        timestamp: '2024-01-19T18:22:00Z',
                        icon: 'Award'
                    }
                ]);

                // Mock achievements
                setAchievements([
                    {
                        id: '1',
                        title: 'First Steps',
                        description: 'Solve your first problem',
                        icon: 'Trophy',
                        unlockedAt: '2024-01-15T12:00:00Z'
                    },
                    {
                        id: '2',
                        title: 'Problem Solver',
                        description: 'Solve 100 problems',
                        icon: 'Target',
                        unlockedAt: '2024-01-19T18:22:00Z'
                    },
                    {
                        id: '3',
                        title: 'Speed Demon',
                        description: 'Solve 10 problems under 1 minute',
                        icon: 'Zap',
                        progress: 7,
                        maxProgress: 10
                    }
                ]);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const getStatusColor = (status: string) => {
        const colors = {
            'Accepted': isDark ? 'text-green-400 bg-green-900/30' : 'text-green-700 bg-green-100',
            'Wrong Answer': isDark ? 'text-yellow-400 bg-yellow-900/30' : 'text-yellow-700 bg-yellow-100',
            'Time Limit Exceeded': isDark ? 'text-red-400 bg-red-900/30' : 'text-red-700 bg-red-100',
            'Runtime Error': isDark ? 'text-red-400 bg-red-900/30' : 'text-red-700 bg-red-100'
        };
        return colors[status as keyof typeof colors] || colors['Wrong Answer'];
    };

    const getStatusIcon = (status: string) => {
        const icons = {
            'Accepted': CheckCircle,
            'Wrong Answer': XCircle,
            'Time Limit Exceeded': Timer,
            'Runtime Error': XCircle
        };
        return icons[status as keyof typeof icons] || XCircle;
    };

    const formatTimeAgo = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        return 'Just now';
    };

    if (isLoading) {
        return (
            <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'
                }`}>
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className={`mt-4 text-xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Loading your dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Dashboard - CodeSorted</title>
                <meta name="description" content="Your coding journey dashboard with statistics, progress tracking, and recent activity" />
            </Head>

            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'
                }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Welcome Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Welcome back, {user?.name || 'Coder'}! 👋
                                </h1>
                                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Ready to continue your coding journey?
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <AnimatedButton
                                    href="/problems"
                                    variant="primary"
                                    gradient={true}
                                    icon={Code2}
                                    glow={true}
                                >
                                    Solve Problems
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/practice"
                                    variant="secondary"
                                    icon={Brain}
                                >
                                    Practice
                                </AnimatedButton>
                            </div>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <GlassCard className="text-center" padding="lg">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {userStats.totalSolved}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Problems Solved
                            </p>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((userStats.totalSolved / 200) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </GlassCard>

                        <GlassCard className="text-center" padding="lg">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {userStats.rating}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Current Rating
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-1">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-green-500 font-medium">+47 this week</span>
                            </div>
                        </GlassCard>

                        <GlassCard className="text-center" padding="lg">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500">
                                {/* <Fire className="w-6 h-6 text-white" /> */}
                            </div>
                            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {userStats.streak}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Day Streak
                            </p>
                            <div className="mt-2 flex justify-center">
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                    Keep it up! 🔥
                                </span>
                            </div>
                        </GlassCard>

                        <GlassCard className="text-center" padding="lg">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                                <Globe className="w-6 h-6 text-white" />
                            </div>
                            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                #{userStats.rank.toLocaleString()}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Global Rank
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-1">
                                <ArrowRight className="w-4 h-4 text-blue-500 rotate-[-45deg]" />
                                <span className="text-xs text-blue-500 font-medium">Top 15%</span>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Progress Overview */}
                        <div className="lg:col-span-2">
                            <GlassCard padding="lg">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
                                        }`}>
                                        <Target className="w-5 h-5 text-blue-500" />
                                        Progress Overview
                                    </h2>
                                    <AnimatedButton
                                        href="/problems"
                                        variant="ghost"
                                        size="sm"
                                        icon={ArrowRight}
                                    >
                                        View All
                                    </AnimatedButton>
                                </div>

                                {/* Difficulty Breakdown */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Easy
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {userStats.easyCount}/150
                                            </span>
                                            <div className="w-32 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(userStats.easyCount / 150) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Medium
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {userStats.mediumCount}/100
                                            </span>
                                            <div className="w-32 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                                <div
                                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(userStats.mediumCount / 100) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Hard
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {userStats.hardCount}/50
                                            </span>
                                            <div className="w-32 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                                <div
                                                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(userStats.hardCount / 50) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Stats */}
                                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userStats.acceptanceRate}%
                                        </div>
                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Acceptance Rate
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userStats.submissions}
                                        </div>
                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Total Submissions
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Quick Actions */}
                        <GlassCard padding="lg">
                            <h2 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                <Zap className="w-5 h-5 text-yellow-500" />
                                Quick Actions
                            </h2>

                            <div className="space-y-3">
                                <AnimatedButton
                                    href="/problems?difficulty=easy"
                                    variant="ghost"
                                    className="w-full justify-start"
                                    icon={PlayCircle}
                                >
                                    Solve Easy Problem
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/problems/random"
                                    variant="ghost"
                                    className="w-full justify-start"
                                    icon={Sparkles}
                                >
                                    Random Challenge
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/contests"
                                    variant="ghost"
                                    className="w-full justify-start"
                                    icon={Trophy}
                                >
                                    Join Contest
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/practice/interview"
                                    variant="ghost"
                                    className="w-full justify-start"
                                    icon={Users}
                                >
                                    Interview Prep
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/learn"
                                    variant="ghost"
                                    className="w-full justify-start"
                                    icon={BookOpen}
                                >
                                    Study Guide
                                </AnimatedButton>
                            </div>

                            {/* Daily Challenge */}
                            <div className={`mt-6 p-4 rounded-lg border-2 border-dashed transition-colors duration-300 ${isDark
                                ? 'border-yellow-500/30 bg-yellow-900/10'
                                : 'border-yellow-300 bg-yellow-50'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Coffee className="w-4 h-4 text-yellow-500" />
                                    <span className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'
                                        }`}>
                                        Daily Challenge
                                    </span>
                                </div>
                                <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Complete today's challenge to maintain your streak!
                                </p>
                                <AnimatedButton
                                    href="/daily-challenge"
                                    variant="warning"
                                    size="sm"
                                    className="w-full"
                                    glow={true}
                                >
                                    Start Challenge
                                </AnimatedButton>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Submissions */}
                        <GlassCard padding="lg">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
                                    }`}>
                                    <Activity className="w-5 h-5 text-green-500" />
                                    Recent Submissions
                                </h2>
                                <AnimatedButton
                                    href="/submissions"
                                    variant="ghost"
                                    size="sm"
                                    icon={ArrowRight}
                                >
                                    View All
                                </AnimatedButton>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <th className="p-4 text-xs font-semibold tracking-wider uppercase">Problem</th>
                                            <th className="p-4 text-xs font-semibold tracking-wider uppercase">Status</th>
                                            <th className="p-4 text-xs font-semibold tracking-wider uppercase">Language</th>
                                            <th className="p-4 text-xs font-semibold tracking-wider uppercase">Runtime</th>
                                            <th className="p-4 text-xs font-semibold tracking-wider uppercase">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentSubmissions.map((submission) => (
                                            <Link href={`/submissions/${submission.id}`} key={submission.id} legacyBehavior>
                                                <tr className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-100'} cursor-pointer transition-colors`}>
                                                    <td className="p-4">
                                                        <span className="font-medium text-blue-500 hover:underline">{submission.problemTitle}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${getStatusColor(submission.status)}`}>
                                                            {(() => {
                                                                const Icon = getStatusIcon(submission.status);
                                                                return <Icon className="w-3 h-3" />;
                                                            })()}
                                                            {submission.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">{submission.language}</td>
                                                    <td className="p-4">{submission.executionTime ? `${submission.executionTime}ms` : '-'}</td>
                                                    <td className="p-4 text-sm">{formatTimeAgo(submission.submittedAt)}</td>
                                                </tr>
                                            </Link>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>

                        {/* Achievements */}
                        <GlassCard padding="lg">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
                                    }`}>
                                    <Medal className="w-5 h-5 text-purple-500" />
                                    Achievements
                                </h2>
                                <AnimatedButton
                                    href="/achievements"
                                    variant="ghost"
                                    size="sm"
                                    icon={ArrowRight}
                                >
                                    View All
                                </AnimatedButton>
                            </div>

                            <div className="space-y-3">
                                {achievements.map((achievement) => (
                                    <div key={achievement.id} className={`p-3 rounded-lg transition-colors duration-300 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${achievement.unlockedAt
                                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                                : isDark ? 'bg-gray-700' : 'bg-gray-300'
                                                }`}>
                                                <Award className={`w-5 h-5 ${achievement.unlockedAt ? 'text-white' : isDark ? 'text-gray-500' : 'text-gray-400'
                                                    }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'
                                                    }`}>
                                                    {achievement.title}
                                                </div>
                                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {achievement.description}
                                                </div>
                                                {achievement.progress !== undefined && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center justify-between text-xs mb-1">
                                                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                                Progress
                                                            </span>
                                                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                                {achievement.progress}/{achievement.maxProgress}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-500"
                                                                style={{ width: `${(achievement.progress! / achievement.maxProgress!) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
                                                {achievement.unlockedAt && (
                                                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        Unlocked {formatTimeAgo(achievement.unlockedAt)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </>
    );
}