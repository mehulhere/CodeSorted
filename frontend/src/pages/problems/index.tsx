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
                problem.title.toLowerCase().includes(lowerSearchTerm)
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
            <Link href={`/problems/${problem.problem_id || problem.id}`}>
                <div className={`p-3 rounded-lg border transition-all duration-300 h-full flex flex-col 
                    ${isDark ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-300'}
                    hover:shadow-md`}
                >
                    {/* Header with Status and Difficulty */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                            {problem.solved ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            ) : problem.attempted ? (
                                <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                            ) : (
                                <Code2 className="w-4 h-4 text-gray-400 mr-2" />
                            )}
                        </div>

                        <span className={`px-2 py-0.5 text-xs rounded-full ${diffConfig.color}`}>
                            {problem.difficulty}
                        </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'}`}>
                        {problem.title}
                    </h3>

                    {/* Footer with Tags and Acceptance Rate */}
                    <div className="mt-auto pt-2">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-2">
                            {problem.tags && problem.tags.slice(0, 2).map((tag, index) => (
                                <span
                                    key={index}
                                    className={`px-1.5 py-0.5 text-xs rounded ${isDark
                                        ? 'bg-blue-900/30 text-blue-400'
                                        : 'bg-blue-50 text-blue-700'
                                        }`}
                                >
                                    {tag}
                                </span>
                            ))}
                            {problem.tags && problem.tags.length > 2 && (
                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    +{problem.tags.length - 2}
                                </span>
                            )}
                        </div>

                        {/* Acceptance Rate */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center">
                                <TrendingUp className={`w-3 h-3 mr-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                    {problem.acceptance_rate?.toFixed(1)}%
                                </span>
                            </div>
                            {problem.bookmark && (
                                <Bookmark className="w-3 h-3 text-yellow-500 fill-current" />
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    // Add a new component for the dense list view
    const ProblemTableRow = ({ problem, index }: { problem: EnhancedProblemListItemType, index: number }) => {
        const diffConfig = getDifficultyConfig(problem.difficulty);

        return (
            <Link href={`/problems/${problem.problem_id || problem.id}`} className={`
                flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-opacity-10
                ${index % 2 === 0 ? (isDark ? 'bg-gray-800/50' : 'bg-gray-100/50') : ''}
                ${isDark ? 'hover:bg-blue-900/30' : 'hover:bg-blue-50'}
            `}>
                {/* Status Icon */}
                <div className="w-6">
                    {problem.solved ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : problem.attempted ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                    ) : (
                        <div className="w-5 h-5" />
                    )}
                </div>

                {/* Title */}
                <div className="flex-1">
                    <span className={`font-medium ${isDark ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'}`}>
                        {problem.title}
                    </span>
                </div>

                {/* Tags (up to 2) */}
                <div className="hidden md:flex gap-1 w-48 flex-wrap">
                    {problem.tags && problem.tags.slice(0, 2).map((tag, idx) => (
                        <span
                            key={idx}
                            className={`px-1.5 py-0.5 text-xs rounded ${isDark
                                ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                                : 'bg-blue-50 text-blue-700'
                                }`}
                        >
                            {tag}
                        </span>
                    ))}
                    {problem.tags && problem.tags.length > 2 && (
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            +{problem.tags.length - 2}
                        </span>
                    )}
                </div>

                {/* Difficulty */}
                <div className="w-24 text-center">
                    <span className={`text-sm px-2 py-1 rounded-full ${diffConfig.color}`}>
                        {problem.difficulty}
                    </span>
                </div>

                {/* Acceptance Rate */}
                <div className="w-20 text-right">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {problem.acceptance_rate?.toFixed(1)}%
                    </span>
                </div>
            </Link>
        );
    };

    if (isLoading) {
        return (
            <div className="page-background">
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
            <div className="page-background flex flex-col justify-center items-center p-4">
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

            <div className="page-background">
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-blue-500' : 'bg-blue-300'}`} />
                    <div className={`absolute bottom-20 -left-20 w-60 h-60 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-purple-500' : 'bg-purple-300'}`} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    {/* Header - More compact */}
                    <div className="mb-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                                <h1 className={`text-4xl font-bold mb-4 text-white ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Problem Set
                                </h1>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Challenge yourself with {problems.length} carefully curated problems
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <AnimatedButton
                                    onClick={fetchProblems}
                                    variant="ghost"
                                    icon={RefreshCw}
                                    loading={isLoading}
                                    className="p-2"
                                >
                                    Refresh
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/problems/create"
                                    variant="success"
                                    icon={Plus}
                                    gradient={true}
                                    className="py-1 px-3"
                                >
                                    Create Problem
                                </AnimatedButton>
                            </div>
                        </div>

                        {/* Quick Stats - More compact */}
                        <div className="grid grid-cols-4 gap-2 mt-4 mb-4">
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
                                    <div
                                        key={stat.label}
                                        className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}
                                    >
                                        <div className={`p-1.5 rounded-full bg-gradient-to-r ${stat.color}`}>
                                            <Icon className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {stat.value}
                                            </div>
                                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {stat.label}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search and Filters - More compact */}
                    <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className="flex flex-col md:flex-row gap-2">
                            <div className="flex-1 relative">
                                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                <input
                                    type="text"
                                    placeholder="Search problems by title, ID, or tag..."
                                    className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm transition-all duration-300 ${isDark
                                        ? 'bg-gray-800 border-gray-800 text-white placeholder-gray-400 focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                                        } focus:ring-1 focus:ring-blue-500/20`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={difficultyFilter}
                                    onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
                                    className={`px-3 py-2 rounded-lg border text-sm transition-all duration-300 ${isDark
                                        ? 'bg-black border-gray-800 text-white focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } focus:ring-1 focus:ring-blue-500/20`}
                                >
                                    <option value="all">All Difficulties</option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className={`px-3 py-2 rounded-lg border text-sm transition-all duration-300 ${isDark
                                        ? 'bg-black border-gray-800 text-white focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                        } focus:ring-1 focus:ring-blue-500/20`}
                                >
                                    <option value="all">All Status</option>
                                    <option value="solved">Solved</option>
                                    <option value="attempted">Attempted</option>
                                    <option value="unsolved">Unsolved</option>
                                </select>

                                <div className="flex rounded-lg border overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 transition-colors duration-200 ${viewMode === 'grid'
                                            ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                                            : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <Grid3X3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 transition-colors duration-200 ${viewMode === 'list'
                                            ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                                            : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Problems Grid/List */}
                    {filteredAndSortedProblems.length === 0 ? (
                        <div className={`text-center py-8 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-white'}`}>
                            <Code2 className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                No problems found
                            </h3>
                            <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} mb-4`}>
                                Try adjusting your search criteria or filters
                            </p>
                            <AnimatedButton onClick={clearFilters} variant="primary" size="sm">
                                Clear Filters
                            </AnimatedButton>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredAndSortedProblems.map((problem) => (
                                <ProblemCard key={problem.id} problem={problem} />
                            ))}
                        </div>
                    ) : (
                        <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                            {/* Table Header */}
                            <div className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                <div className="w-6"></div>
                                <div className="flex-1">Title</div>
                                <div className="hidden md:block w-48">Tags</div>
                                <div className="w-24 text-center">Difficulty</div>
                                <div className="w-20 text-right">Acceptance</div>
                            </div>

                            {/* Table Rows */}
                            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                                {filteredAndSortedProblems.map((problem, index) => (
                                    <ProblemTableRow key={problem.id} problem={problem} index={index} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results Count */}
                    <div className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Showing {filteredAndSortedProblems.length} of {problems.length} problems
                    </div>
                </div>
            </div>
        </>
    );
}