import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import {
    Search,
    Filter,
    ArrowUpDown,
    X,
    RefreshCw,
    Grid3X3,
    List,
    Plus,
    CheckCircle,
    Clock,
    Target,
    Zap,
    TrendingUp,
    Award,
    Code2,
    Eye,
    Star,
    Bookmark
} from 'lucide-react';
import type { ProblemListItemType, ApiError } from '@/types/problem';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import Skeleton from '@/components/ui/Skeleton';
import '@/app/globals.css';

// Add acceptance rate to the problem list item type
interface EnhancedProblemListItemType extends ProblemListItemType {
    acceptance_rate?: number;
    solved?: boolean;
    attempted?: boolean;
    bookmark?: boolean;
}

// Type for available sort options
type SortOption = 'id' | 'title' | 'difficulty' | 'acceptance_rate';

// Type for difficulty filter options
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

type ViewMode = 'grid' | 'list';

export default function ProblemsPage() {
    const { isDark } = useTheme();

    // State for data
    const [problems, setProblems] = useState<EnhancedProblemListItemType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for filtering and sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
    const [skillFilter, setSkillFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'attempted' | 'unsolved'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Get unique skills/tags from all problems
    const availableSkills = useMemo(() => {
        const skillSet = new Set<string>();
        problems.forEach(problem => {
            if (problem.tags) {
                problem.tags.forEach(tag => skillSet.add(tag));
            }
        });
        return Array.from(skillSet).sort();
    }, [problems]);

    const fetchProblems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/problems`, { cache: 'no-store' });
            if (!response.ok) {
                const errorData: ApiError = await response.json();
                setError(errorData.message || `Failed to fetch problems: ${response.status}`);
                return;
            }
            const data: EnhancedProblemListItemType[] = await response.json();
            // Add mock data for demo purposes
            const enhancedData = data.map(problem => ({
                ...problem,
                acceptance_rate: Math.floor(Math.random() * 60) + 20,
                solved: Math.random() > 0.7,
                attempted: Math.random() > 0.5,
                bookmark: Math.random() > 0.8
            }));
            setProblems(enhancedData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error("Fetch problems error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProblems();
    }, []);

    // Apply filters and sorting
    const filteredAndSortedProblems = useMemo(() => {
        let result = [...problems];

        // Apply search filter
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(problem =>
                problem.title.toLowerCase().includes(lowerSearchTerm) ||
                problem.problem_id.toLowerCase().includes(lowerSearchTerm) ||
                (problem.tags && problem.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
            );
        }

        // Apply difficulty filter
        if (difficultyFilter !== 'all') {
            result = result.filter(problem =>
                problem.difficulty.toLowerCase() === difficultyFilter
            );
        }

        // Apply skill/tag filter
        if (skillFilter !== 'all') {
            result = result.filter(problem =>
                problem.tags && problem.tags.includes(skillFilter)
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(problem => {
                switch (statusFilter) {
                    case 'solved': return problem.solved;
                    case 'attempted': return problem.attempted && !problem.solved;
                    case 'unsolved': return !problem.attempted && !problem.solved;
                    default: return true;
                }
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'id':
                    comparison = a.problem_id.localeCompare(b.problem_id);
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'difficulty':
                    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
                    const diffA = difficultyOrder[a.difficulty.toLowerCase() as keyof typeof difficultyOrder] || 0;
                    const diffB = difficultyOrder[b.difficulty.toLowerCase() as keyof typeof difficultyOrder] || 0;
                    comparison = diffA - diffB;
                    break;
                case 'acceptance_rate':
                    const rateA = a.acceptance_rate || 0;
                    const rateB = b.acceptance_rate || 0;
                    comparison = rateA - rateB;
                    break;
                default:
                    comparison = 0;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [problems, searchTerm, difficultyFilter, skillFilter, statusFilter, sortBy, sortDirection]);

    const getDifficultyConfig = (difficulty: string) => {
        const configs = {
            easy: {
                color: isDark ? 'text-green-400 bg-green-900/30 border-green-500/30' : 'text-green-700 bg-green-100 border-green-200',
                icon: CheckCircle,
                dots: '●'
            },
            medium: {
                color: isDark ? 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' : 'text-yellow-700 bg-yellow-100 border-yellow-200',
                icon: Clock,
                dots: '●●'
            },
            hard: {
                color: isDark ? 'text-red-400 bg-red-900/30 border-red-500/30' : 'text-red-700 bg-red-100 border-red-200',
                icon: Target,
                dots: '●●●'
            }
        };
        return configs[difficulty.toLowerCase() as keyof typeof configs] || configs.easy;
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDifficultyFilter('all');
        setSkillFilter('all');
        setStatusFilter('all');
    };

    const ProblemCard = ({ problem }: { problem: EnhancedProblemListItemType }) => {
        const diffConfig = getDifficultyConfig(problem.difficulty);
        const DifficultyIcon = diffConfig.icon;

        return (
            <GlassCard
                className="group cursor-pointer"
                hover={true}
                padding="lg"
            >
                <Link href={`/problems/${problem.problem_id || problem.id}`}>
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${problem.solved
                                    ? 'bg-green-500/20 text-green-500'
                                    : problem.attempted
                                        ? 'bg-yellow-500/20 text-yellow-500'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                    }`}>
                                    {problem.solved ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : problem.attempted ? (
                                        <Clock className="w-5 h-5" />
                                    ) : (
                                        <Code2 className="w-5 h-5" />
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {problem.bookmark && (
                                    <Bookmark className="w-4 h-4 text-yellow-500 fill-current" />
                                )}
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${diffConfig.color}`}>
                                    <span className="mr-1">{diffConfig.dots}</span>
                                    {problem.difficulty}
                                </span>
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <h3 className={`text-lg font-semibold mb-2 group-hover:text-blue-500 transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                {problem.title}
                            </h3>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <TrendingUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {problem.acceptance_rate?.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Eye className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {Math.floor(Math.random() * 1000) + 100}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        {problem.tags && problem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {problem.tags.slice(0, 3).map((tag, index) => (
                                    <span
                                        key={index}
                                        className={`px-2 py-1 rounded-md text-xs font-medium ${isDark
                                            ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                                            }`}
                                    >
                                        {tag}
                                    </span>
                                ))}
                                {problem.tags.length > 3 && (
                                    <span className={`px-2 py-1 rounded-md text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'
                                        }`}>
                                        +{problem.tags.length - 3}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </Link>
            </GlassCard>
        );
    };

    if (isLoading) {
        return (
            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <Skeleton className="h-12 w-64 mb-4" />
                        <Skeleton className="h-32 w-full mb-6" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 9 }).map((_, index) => (
                            <Skeleton key={index} className="h-64 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`min-h-screen flex flex-col justify-center items-center p-4 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className={`p-6 rounded-lg border-l-4 ${isDark
                    ? 'bg-red-900/20 border-red-500 text-red-400'
                    : 'bg-red-50 border-red-400 text-red-700'
                    }`}>
                    <p className="font-medium">Failed to load problems</p>
                    <p className="text-sm mt-1">{error}</p>
                    <AnimatedButton
                        onClick={fetchProblems}
                        className="mt-4"
                        icon={RefreshCw}
                        variant="danger"
                    >
                        Try Again
                    </AnimatedButton>
                </div>
            </div>
        );
    }

    const activeFiltersCount = [
        searchTerm,
        difficultyFilter !== 'all' ? difficultyFilter : null,
        skillFilter !== 'all' ? skillFilter : null,
        statusFilter !== 'all' ? statusFilter : null
    ].filter(Boolean).length;

    return (
        <>
            <Head>
                <title>Problems - CodeSorted</title>
                <meta name="description" content="Explore our curated collection of coding challenges and algorithmic problems" />
            </Head>

            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-blue-500' : 'bg-blue-300'}`} />
                    <div className={`absolute bottom-20 -left-20 w-60 h-60 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-purple-500' : 'bg-purple-300'}`} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div>
                                <h1 className={`text-4xl md:text-5xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        Problem Set
                                    </span>
                                </h1>
                                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Challenge yourself with {problems.length} carefully curated problems
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <AnimatedButton
                                    onClick={fetchProblems}
                                    variant="ghost"
                                    icon={RefreshCw}
                                    loading={isLoading}
                                    className="p-3"
                                >
                                    Refresh
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/problems/create"
                                    variant="success"
                                    icon={Plus}
                                    gradient={true}
                                    glow={true}
                                >
                                    Create Problem
                                </AnimatedButton>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                            {[
                                {
                                    label: 'Total Problems',
                                    value: problems.length,
                                    icon: Code2,
                                    color: 'from-blue-500 to-cyan-500'
                                },
                                {
                                    label: 'Solved',
                                    value: problems.filter(p => p.solved).length,
                                    icon: CheckCircle,
                                    color: 'from-green-500 to-emerald-500'
                                },
                                {
                                    label: 'Attempted',
                                    value: problems.filter(p => p.attempted && !p.solved).length,
                                    icon: Clock,
                                    color: 'from-yellow-500 to-orange-500'
                                },
                                {
                                    label: 'Bookmarked',
                                    value: problems.filter(p => p.bookmark).length,
                                    icon: Bookmark,
                                    color: 'from-purple-500 to-pink-500'
                                }
                            ].map((stat, index) => {
                                const Icon = stat.icon;
                                return (
                                    <GlassCard key={stat.label} className="text-center" padding="md">
                                        <div className={`inline-flex p-2 rounded-full bg-gradient-to-r ${stat.color} mb-2`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {stat.value}
                                        </div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {stat.label}
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <GlassCard className="mb-8" padding="lg">
                        <div className="space-y-6">
                            {/* Search and View Toggle */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'
                                        }`} />
                                    <input
                                        type="text"
                                        placeholder="Search problems by title, ID, or tag..."
                                        className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-300 ${isDark
                                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                                            } focus:ring-2 focus:ring-blue-500/20`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <AnimatedButton
                                        onClick={() => setShowFilters(!showFilters)}
                                        variant="secondary"
                                        icon={Filter}
                                        className="relative"
                                    >
                                        Filters
                                        {activeFiltersCount > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {activeFiltersCount}
                                            </span>
                                        )}
                                    </AnimatedButton>

                                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 transition-colors duration-200 ${viewMode === 'grid'
                                                ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                                                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            <Grid3X3 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 transition-colors duration-200 ${viewMode === 'list'
                                                ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                                                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            <List className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Filters */}
                            {showFilters && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    {/* Difficulty Filter */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Difficulty
                                        </label>
                                        <select
                                            value={difficultyFilter}
                                            onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
                                            className={`w-full px-3 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                } focus:ring-2 focus:ring-blue-500/20`}
                                        >
                                            <option value="all">All Difficulties</option>
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Status
                                        </label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                            className={`w-full px-3 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                } focus:ring-2 focus:ring-blue-500/20`}
                                        >
                                            <option value="all">All Problems</option>
                                            <option value="solved">Solved</option>
                                            <option value="attempted">Attempted</option>
                                            <option value="unsolved">Unsolved</option>
                                        </select>
                                    </div>

                                    {/* Skill Filter */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Category
                                        </label>
                                        <select
                                            value={skillFilter}
                                            onChange={(e) => setSkillFilter(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                } focus:ring-2 focus:ring-blue-500/20`}
                                        >
                                            <option value="all">All Categories</option>
                                            {availableSkills.map((skill) => (
                                                <option key={skill} value={skill}>{skill}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sort */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Sort By
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                                className={`flex-1 px-3 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                    } focus:ring-2 focus:ring-blue-500/20`}
                                            >
                                                <option value="id">ID</option>
                                                <option value="title">Title</option>
                                                <option value="difficulty">Difficulty</option>
                                                <option value="acceptance_rate">Acceptance</option>
                                            </select>
                                            <button
                                                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                className={`p-2 rounded-lg border transition-all duration-300 ${isDark
                                                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800'
                                                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <ArrowUpDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active Filters */}
                            {activeFiltersCount > 0 && (
                                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Active filters:
                                    </span>

                                    {[
                                        searchTerm && { label: `Search: ${searchTerm}`, clear: () => setSearchTerm('') },
                                        difficultyFilter !== 'all' && { label: `Difficulty: ${difficultyFilter}`, clear: () => setDifficultyFilter('all') },
                                        skillFilter !== 'all' && { label: `Category: ${skillFilter}`, clear: () => setSkillFilter('all') },
                                        statusFilter !== 'all' && { label: `Status: ${statusFilter}`, clear: () => setStatusFilter('all') }
                                    ].filter(Boolean).map((filter: any, index) => (
                                        <span
                                            key={index}
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${isDark
                                                ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                }`}
                                        >
                                            {filter.label}
                                            <button onClick={filter.clear} className="ml-1 hover:scale-110 transition-transform">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}

                                    <AnimatedButton
                                        onClick={clearFilters}
                                        variant="ghost"
                                        size="sm"
                                        className="ml-auto"
                                    >
                                        Clear all
                                    </AnimatedButton>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Results Count */}
                    <div className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Showing {filteredAndSortedProblems.length} of {problems.length} problems
                    </div>

                    {/* Problems Grid/List */}
                    {filteredAndSortedProblems.length === 0 ? (
                        <GlassCard className="text-center py-12">
                            <Code2 className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                No problems found
                            </h3>
                            <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} mb-4`}>
                                Try adjusting your search criteria or filters
                            </p>
                            <AnimatedButton onClick={clearFilters} variant="primary">
                                Clear Filters
                            </AnimatedButton>
                        </GlassCard>
                    ) : (
                        <div className={`
                            ${viewMode === 'grid'
                                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                                : 'space-y-4'
                            }
                        `}>
                            {filteredAndSortedProblems.map((problem) => (
                                <ProblemCard key={problem.id} problem={problem} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}