import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
    Code2,
    Trophy,
    Users,
    Zap,
    ArrowRight,
    CheckCircle,
    Clock,
    Target,
    Sparkles,
    TrendingUp,
    Award,
    Brain
} from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import Skeleton, { SkeletonCard } from '@/components/ui/Skeleton';
import '@/app/globals.css';

// Define problem type
interface Problem {
    id: string;
    problem_id: string;
    title: string;
    difficulty: string;
    tags: string[];
    solved?: boolean;
}

interface UserStats {
    total_solved: number;
    easy_solved: number;
    medium_solved: number;
    hard_solved: number;
}

export default function HomePage() {
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const [problems, setProblems] = useState<Problem[]>([]);
    const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [username, setUsername] = useState<string | null>(null);

    // Filter states
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Available tags extracted from problems
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    useEffect(() => {
        // Fetch problems from API
        const fetchProblems = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/problems`);
                if (!response.ok) {
                    setError(`Error: ${response.status}`);
                    return;
                }
                const data = await response.json();
                setProblems(data);
                setFilteredProblems(data);

                // Extract unique tags
                const tags = new Set<string>();
                data.forEach((problem: Problem) => {
                    problem.tags?.forEach(tag => tags.add(tag));
                });
                setAvailableTags(Array.from(tags));
            } catch (err) {
                setError('Failed to fetch problems');
                console.error('Error fetching problems:', err);
            } finally {
                setLoading(false);
            }
        };

        // Check auth status and fetch user stats if logged in
        const checkAuthAndFetchStats = async () => {
            try {
                const authResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth-status`, {
                    withCredentials: true,
                });

                if (authResponse.data.isLoggedIn) {
                    setIsLoggedIn(true);
                    setUsername(authResponse.data.user.username);

                    // Fetch user stats
                    const statsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${authResponse.data.user.username}/stats`);
                    setUserStats(statsResponse.data);
                } else {
                    setIsLoggedIn(false);
                    setUsername(null);
                    setUserStats(null);
                }
            } catch (err) {
                console.error('Error checking auth status or fetching stats:', err);
                setIsLoggedIn(false);
                setUsername(null);
                setUserStats(null);
            }
        };

        fetchProblems();
        checkAuthAndFetchStats();
    }, []);

    // Apply filters whenever any filter changes
    useEffect(() => {
        let result = [...problems];

        if (selectedDifficulty !== 'all') {
            result = result.filter(problem => problem.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());
        }

        if (selectedStatus !== 'all') {
            result = result.filter(problem => {
                if (selectedStatus === 'solved') return problem.solved;
                if (selectedStatus === 'unsolved') return !problem.solved;
                return true;
            });
        }

        if (selectedTag !== 'all') {
            result = result.filter(problem => problem.tags?.includes(selectedTag));
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(problem =>
                problem.title.toLowerCase().includes(query) ||
                problem.problem_id.toLowerCase().includes(query)
            );
        }

        setFilteredProblems(result);
    }, [selectedDifficulty, selectedStatus, selectedTag, searchQuery, problems]);

    const difficultyConfig = {
        easy: {
            color: isDark ? 'text-green-400 bg-green-900/30 border-green-500/30' : 'text-green-700 bg-green-100 border-green-200',
            icon: '●'
        },
        medium: {
            color: isDark ? 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' : 'text-yellow-700 bg-yellow-100 border-yellow-200',
            icon: '●●'
        },
        hard: {
            color: isDark ? 'text-red-400 bg-red-900/30 border-red-500/30' : 'text-red-700 bg-red-100 border-red-200',
            icon: '●●●'
        }
    };

    const featuredStats = [
        {
            label: 'Total Problems',
            value: problems.length,
            icon: Code2,
            color: 'from-blue-500 to-cyan-500',
            bgColor: isDark ? 'bg-blue-900/20' : 'bg-blue-50'
        },
        {
            label: 'Active Users',
            value: '100+',
            icon: Users,
            color: 'from-purple-500 to-pink-500',
            bgColor: isDark ? 'bg-purple-900/20' : 'bg-purple-50'
        },
        {
            label: 'Solutions',
            value: '500+',
            icon: Trophy,
            color: 'from-green-500 to-emerald-500',
            bgColor: isDark ? 'bg-green-900/20' : 'bg-green-50'
        },
        {
            label: 'Success Rate',
            value: '85%',
            icon: Target,
            color: 'from-orange-500 to-red-500',
            bgColor: isDark ? 'bg-orange-900/20' : 'bg-orange-50'
        }
    ];

    return (
        <>
            <Head>
                <title>CodeSorted - Master Your Coding Skills</title>
                <meta name="description" content="Transform your programming journey with our revolutionary Online Judge platform. Practice, compete, and excel." />
                <meta name="keywords" content="coding, programming, algorithms, competitive programming, online judge" />
            </Head>

            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 ${isDark ? 'bg-blue-500' : 'bg-blue-300'}`} />
                    <div className={`absolute top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 ${isDark ? 'bg-purple-500' : 'bg-purple-300'}`} />
                    <div className={`absolute bottom-40 right-20 w-80 h-80 rounded-full blur-3xl opacity-20 ${isDark ? 'bg-pink-500' : 'bg-pink-300'}`} />
                </div>

                <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Revolutionary Hero Section */}
                    <section className="mb-20">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 mb-6">
                                <Sparkles className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                                    New Era of Coding
                                </span>
                                <Sparkles className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                            </div>

                            <h1 className={`text-6xl md:text-7xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Master Your
                                </span>
                                <br />
                                <span className="bg-gradient-to-r from-pink-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
                                    Coding Journey
                                </span>
                            </h1>

                            <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                Transform your programming skills with our revolutionary platform.
                                Practice algorithms, compete with peers, and unlock your coding potential.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link
                                    href="/problems"
                                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-3"
                                >
                                    <Code2 className="w-5 h-5" />
                                    Start Coding Now
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </Link>

                                {!isLoggedIn && (
                                    <Link
                                        href="/register"
                                        className={`px-8 py-4 font-semibold rounded-xl border-2 transition-all duration-300 flex items-center gap-3 ${isDark
                                            ? 'border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                            }`}
                                    >
                                        <Zap className="w-5 h-5" />
                                        Join Free
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Featured Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            {featuredStats.map((stat, index) => {
                                const Icon = stat.icon;
                                return (
                                    <GlassCard
                                        key={stat.label}
                                        className={`text-center hover:scale-105 transition-all duration-300 ${stat.bgColor}`}
                                        hover={true}
                                        glow={true}
                                    >
                                        <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${stat.color} mb-4`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {stat.value}
                                        </div>
                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {stat.label}
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>

                        {/* User Progress Section (if logged in) */}
                        {isLoggedIn && userStats && (
                            <GlassCard className="mb-12" gradient={true} glow={true}>
                                <div className="text-center">
                                    <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Welcome back, {username}! 🚀
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Total Solved', value: userStats.total_solved, icon: Trophy, color: 'text-yellow-500' },
                                            { label: 'Easy', value: userStats.easy_solved, icon: CheckCircle, color: 'text-green-500' },
                                            { label: 'Medium', value: userStats.medium_solved, icon: Clock, color: 'text-yellow-500' },
                                            { label: 'Hard', value: userStats.hard_solved, icon: Award, color: 'text-red-500' }
                                        ].map((item, index) => {
                                            const Icon = item.icon;
                                            return (
                                                <div key={item.label} className="text-center">
                                                    <Icon className={`w-8 h-8 mx-auto mb-2 ${item.color}`} />
                                                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {item.value}
                                                    </div>
                                                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {item.label}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                    </section>

                    {/* Featured Problems Section */}
                    <section className="mb-20">
                        <GlassCard padding="lg">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                                <div>
                                    <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Featured Problems
                                    </h2>
                                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Hand-picked challenges to boost your skills
                                    </p>
                                </div>
                                <div className="flex gap-3 mt-4 sm:mt-0">
                                    {isLoggedIn && (
                                        <Link
                                            href="/problems/create"
                                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:scale-105 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Create Problem
                                        </Link>
                                    )}
                                    <Link
                                        href="/problems"
                                        className={`px-4 py-2 font-medium rounded-lg transition-all duration-300 flex items-center gap-2 ${isDark
                                            ? 'text-blue-400 hover:bg-blue-900/30'
                                            : 'text-blue-600 hover:bg-blue-50'
                                            }`}
                                    >
                                        View All Problems
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>

                            {/* Enhanced Filter Controls */}
                            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    {
                                        id: 'search',
                                        label: 'Search Problems',
                                        type: 'input',
                                        placeholder: 'Problem name or ID',
                                        value: searchQuery,
                                        onChange: setSearchQuery
                                    },
                                    {
                                        id: 'difficulty',
                                        label: 'Difficulty',
                                        type: 'select',
                                        options: [
                                            { value: 'all', label: 'All Difficulties' },
                                            { value: 'easy', label: 'Easy' },
                                            { value: 'medium', label: 'Medium' },
                                            { value: 'hard', label: 'Hard' }
                                        ],
                                        value: selectedDifficulty,
                                        onChange: setSelectedDifficulty
                                    },
                                    {
                                        id: 'status',
                                        label: 'Status',
                                        type: 'select',
                                        options: [
                                            { value: 'all', label: 'All Problems' },
                                            { value: 'solved', label: 'Solved' },
                                            { value: 'unsolved', label: 'Unsolved' }
                                        ],
                                        value: selectedStatus,
                                        onChange: setSelectedStatus
                                    },
                                    {
                                        id: 'tag',
                                        label: 'Category',
                                        type: 'select',
                                        options: [
                                            { value: 'all', label: 'All Categories' },
                                            ...availableTags.map(tag => ({ value: tag, label: tag }))
                                        ],
                                        value: selectedTag,
                                        onChange: setSelectedTag
                                    }
                                ].map((field) => (
                                    <div key={field.id}>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {field.label}
                                        </label>
                                        {field.type === 'input' ? (
                                            <input
                                                type="text"
                                                className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                                                    } focus:ring-2 focus:ring-blue-500/20`}
                                                placeholder={field.placeholder}
                                                value={field.value as string}
                                                onChange={(e) => field.onChange(e.target.value)}
                                            />
                                        ) : (
                                            <select
                                                className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                    } focus:ring-2 focus:ring-blue-500/20`}
                                                value={field.value as string}
                                                onChange={(e) => field.onChange(e.target.value)}
                                            >
                                                {field.options?.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Enhanced Problems Table */}
                            {loading ? (
                                <div className="space-y-4">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <SkeletonCard key={index} />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className={`p-6 rounded-lg border-l-4 ${isDark
                                    ? 'bg-red-900/20 border-red-500 text-red-400'
                                    : 'bg-red-50 border-red-400 text-red-700'
                                    }`}>
                                    <p className="font-medium">Error loading problems</p>
                                    <p className="text-sm mt-1">{error}</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                                <tr>
                                                    {['Status', 'Title', 'Difficulty', 'Tags'].map((header) => (
                                                        <th key={header} className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                                {filteredProblems.slice(0, 5).map((problem) => (
                                                    <tr key={problem.id} className={`transition-colors duration-200 ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                                                        }`}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {problem.solved ? (
                                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                            ) : (
                                                                <div className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-gray-600' : 'border-gray-300'
                                                                    }`} />
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <Link
                                                                href={`/problems/${problem.problem_id}`}
                                                                className={`font-medium hover:underline transition-colors duration-200 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                                                    }`}
                                                            >
                                                                {problem.title}
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficultyConfig[problem.difficulty.toLowerCase() as keyof typeof difficultyConfig]?.color || 'text-gray-500 bg-gray-100'
                                                                }`}>
                                                                {difficultyConfig[problem.difficulty.toLowerCase() as keyof typeof difficultyConfig]?.icon} {problem.difficulty}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <div className="flex flex-wrap gap-1">
                                                                {problem.tags?.slice(0, 3).map((tag) => (
                                                                    <span key={tag} className={`px-2 py-1 rounded-md text-xs font-medium ${isDark
                                                                        ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                                                                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                                        }`}>
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                                {problem.tags && problem.tags.length > 3 && (
                                                                    <span className={`px-2 py-1 rounded-md text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'
                                                                        }`}>
                                                                        +{problem.tags.length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {filteredProblems.length === 0 && !loading && !error && (
                                <div className="text-center py-12">
                                    <Brain className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                    <p className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        No problems match your criteria
                                    </p>
                                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                        Try adjusting your filters to discover more challenges
                                    </p>
                                </div>
                            )}
                        </GlassCard>
                    </section>

                    {/* Platform Features Section */}
                    <section className="mb-20">
                        <div className="text-center mb-12">
                            <h2 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Why Choose CodeSorted?
                            </h2>
                            <p className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Experience the future of competitive programming
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: Code2,
                                    title: 'Smart Code Editor',
                                    description: 'Advanced Monaco editor with syntax highlighting, auto-completion, and real-time error detection.',
                                    gradient: 'from-blue-500 to-cyan-500'
                                },
                                {
                                    icon: TrendingUp,
                                    title: 'Progress Tracking',
                                    description: 'Detailed analytics, skill assessments, and personalized learning paths to accelerate your growth.',
                                    gradient: 'from-purple-500 to-pink-500'
                                },
                                {
                                    icon: Trophy,
                                    title: 'Competitive Challenges',
                                    description: 'Join contests, climb leaderboards, and compete with programmers from around the world.',
                                    gradient: 'from-green-500 to-emerald-500'
                                }
                            ].map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <GlassCard key={feature.title} className="text-center group" hover={true} glow={true}>
                                        <div className={`inline-flex p-4 rounded-full bg-gradient-to-r ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {feature.title}
                                        </h3>
                                        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
                                            {feature.description}
                                        </p>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    </section>
                </main>

                {/* Enhanced Footer */}
                <footer className={`relative ${isDark ? 'bg-gray-900/80' : 'bg-gray-900'} backdrop-blur-lg`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="col-span-1 md:col-span-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                                        <Code2 className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-2xl font-bold text-white">CodeSorted</span>
                                </div>
                                <p className="text-gray-400 mb-6 max-w-md">
                                    Empowering developers worldwide to master algorithms, compete in challenges,
                                    and build extraordinary coding skills.
                                </p>
                                <div className="flex gap-4">
                                    <Link href="/problems" className="text-blue-400 hover:text-blue-300 transition-colors duration-300">
                                        Start Learning →
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-4">Platform</h3>
                                <ul className="space-y-2">
                                    {['Problems', 'Contests', 'Leaderboard', 'Tutorials'].map((item) => (
                                        <li key={item}>
                                            <Link href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-4">Community</h3>
                                <ul className="space-y-2">
                                    {['Discord', 'GitHub', 'Blog', 'Support'].map((item) => (
                                        <li key={item}>
                                            <Link href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
                            <p className="text-gray-400">© 2025 CodeSorted. Crafted with ❤️ for developers.</p>
                            <div className="flex gap-6 mt-4 md:mt-0">
                                <Link href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy</Link>
                                <Link href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Terms</Link>
                                <Link href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Contact</Link>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}