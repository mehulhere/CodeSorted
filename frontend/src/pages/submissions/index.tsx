import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    Activity,
    BarChart3,
    Calendar,
    Code,
    Filter,
    Grid3X3,
    List,
    Search,
    TrendingUp,
    Users,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Zap,
    RefreshCw,
    Download,
    ArrowUpDown
} from 'lucide-react';
import '@/app/globals.css';
import { useAuthContext } from '@/lib/AuthContext';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import Timeline from '@/components/ui/Timeline';
import SubmissionAnalytics from '@/components/ui/SubmissionAnalytics';
import SubmissionDetailModal from '@/components/ui/SubmissionDetailModal';
import Skeleton from '@/components/ui/Skeleton';

// Define submission type
interface Submission {
    id: string;
    user_id: string;
    username: string;
    problem_id: string;
    problem_title: string;
    language: string;
    status: string;
    execution_time_ms: number;
    submitted_at: string;
}

// Define pagination type
interface Pagination {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export default function SubmissionsPage() {
    const router = useRouter();
    const { isLoggedIn, user } = useAuthContext();
    const { isDark } = useTheme();

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<Pagination>({
        total: 0,
        page: 1,
        limit: 50,
        total_pages: 0
    });

    // Filter states
    const [problemName, setProblemName] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [languageFilter, setLanguageFilter] = useState<string>("all");
    const [mySubmissionsOnly, setMySubmissionsOnly] = useState<boolean>(true);
    const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'analytics'>('timeline');
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        // If user is logged in, default to showing their submissions
        if (isLoggedIn) {
            setMySubmissionsOnly(true);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        // Fetch submissions when page changes or 'My submissions only' filter is toggled
        fetchSubmissions();
    }, [pagination.page, mySubmissionsOnly]);

    const fetchSubmissions = async () => {
        setLoading(true);
        setError(null); // Clear any previous errors
        try {
            // Build query parameters
            const queryParams = new URLSearchParams();

            if (problemName) {
                queryParams.append('problem_name', problemName);
            }

            if (statusFilter !== 'all') {
                queryParams.append('status', statusFilter);
            }

            if (languageFilter !== 'all') {
                queryParams.append('language', languageFilter);
            }

            if (mySubmissionsOnly) {
                queryParams.append('my_submissions', 'true');
            }

            if (pagination.page > 1) {
                queryParams.append('page', pagination.page.toString());
            }

            queryParams.append('limit', pagination.limit.toString());

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/submissions?${queryParams.toString()}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            // Use server-side filtering through API params
            setSubmissions(data.submissions || []);
            setPagination(data.pagination || {
                total: 0,
                page: 1,
                limit: 50,
                total_pages: 0
            });
        } catch (err) {
            setError('Failed to fetch submissions');
            console.error('Error fetching submissions:', err);
            setSubmissions([]); // Initialize to empty array on error
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'ACCEPTED':
                return 'bg-green-100 text-green-800';
            case 'WRONG_ANSWER':
                return 'bg-red-100 text-red-800';
            case 'TIME_LIMIT_EXCEEDED':
                return 'bg-yellow-100 text-yellow-800';
            case 'MEMORY_LIMIT_EXCEEDED':
                return 'bg-yellow-100 text-yellow-800';
            case 'RUNTIME_ERROR':
                return 'bg-orange-100 text-orange-800';
            case 'COMPILATION_ERROR':
                return 'bg-orange-100 text-orange-800';
            case 'PENDING':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPagination({ ...pagination, page: newPage });
        }
    };

    // Add a function to handle form submission
    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSubmissions();
    };

    // Add a reset function
    const resetFilters = () => {
        setProblemName("");
        setStatusFilter("all");
        setLanguageFilter("all");
        setMySubmissionsOnly(false);
        setPagination({
            ...pagination,
            page: 1
        });

        // The fetch will be triggered by the useEffect hook.
    };

    // Transform submissions to timeline format
    const getTimelineItems = () => {
        return submissions.map(submission => ({
            id: submission.id,
            title: submission.problem_title || `Problem ${submission.problem_id}`,
            subtitle: `Solution submitted by ${submission.username}`,
            status: getTimelineStatus(submission.status),
            timestamp: submission.submitted_at,
            language: submission.language,
            executionTime: submission.execution_time_ms,
            details: getStatusText(submission.status),
            onClick: () => {
                setSelectedSubmission(submission);
                setShowDetailModal(true);
            }
        }));
    };

    const getTimelineStatus = (status: string): 'success' | 'error' | 'warning' | 'pending' | 'running' => {
        switch (status) {
            case 'ACCEPTED': return 'success';
            case 'WRONG_ANSWER':
            case 'RUNTIME_ERROR':
            case 'COMPILATION_ERROR': return 'error';
            case 'TIME_LIMIT_EXCEEDED':
            case 'MEMORY_LIMIT_EXCEEDED': return 'warning';
            case 'PENDING': return 'running';
            default: return 'error';
        }
    };

    const getStatusText = (status: string) => {
        return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    // Get analytics data
    const getAnalyticsData = () => {
        const statusCount: { [key: string]: number } = {};
        submissions.forEach(submission => {
            statusCount[submission.status] = (statusCount[submission.status] || 0) + 1;
        });

        return [
            {
                label: 'Accepted',
                value: statusCount['ACCEPTED'] || 0,
                color: '#10B981',
                percentage: 5.2
            },
            {
                label: 'Wrong Answer',
                value: statusCount['WRONG_ANSWER'] || 0,
                color: '#EF4444',
                percentage: -2.1
            },
            {
                label: 'Time Limit Exceeded',
                value: statusCount['TIME_LIMIT_EXCEEDED'] || 0,
                color: '#F59E0B',
                percentage: 1.8
            },
            {
                label: 'Runtime Error',
                value: statusCount['RUNTIME_ERROR'] || 0,
                color: '#F97316',
                percentage: -0.5
            },
            {
                label: 'Compilation Error',
                value: statusCount['COMPILATION_ERROR'] || 0,
                color: '#EF4444',
                percentage: -1.2
            }
        ];
    };

    const activeFiltersCount = [problemName, statusFilter !== 'all', languageFilter !== 'all', mySubmissionsOnly].filter(Boolean).length;

    return (
        <>
            <Head>
                <title>Submissions Dashboard | CodeSorted</title>
                <meta name="description" content="Advanced submissions tracking with analytics and timeline view" />
            </Head>

            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-blue-500' : 'bg-blue-300'}`} />
                    <div className={`absolute top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-purple-500' : 'bg-purple-300'}`} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Enhanced Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div>
                                <h1 className={`text-4xl md:text-5xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        Submissions
                                    </span>
                                </h1>
                                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Track your coding journey with advanced analytics
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <AnimatedButton
                                    onClick={() => fetchSubmissions()}
                                    variant="secondary"
                                    icon={RefreshCw}
                                    className={loading ? 'animate-spin' : ''}
                                >
                                    Refresh
                                </AnimatedButton>

                                <AnimatedButton
                                    href="/problems"
                                    variant="primary"
                                    gradient={true}
                                    icon={Code}
                                    glow={true}
                                >
                                    Solve Problems
                                </AnimatedButton>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                            {[
                                {
                                    label: 'Total Submissions',
                                    value: pagination.total.toLocaleString(),
                                    icon: Activity,
                                    color: 'from-blue-500 to-cyan-500',
                                    bgColor: isDark ? 'bg-blue-900/20' : 'bg-blue-50'
                                },
                                {
                                    label: 'Success Rate',
                                    value: `${submissions.length > 0 ? ((submissions.filter(s => s.status === 'ACCEPTED').length / submissions.length) * 100).toFixed(1) : '0.0'}%`,
                                    icon: TrendingUp,
                                    color: 'from-green-500 to-emerald-500',
                                    bgColor: isDark ? 'bg-green-900/20' : 'bg-green-50'
                                },
                                {
                                    label: 'Languages Used',
                                    value: new Set(submissions.map(s => s.language)).size.toString(),
                                    icon: Code,
                                    color: 'from-purple-500 to-pink-500',
                                    bgColor: isDark ? 'bg-purple-900/20' : 'bg-purple-50'
                                },
                                {
                                    label: 'Active Users',
                                    value: new Set(submissions.map(s => s.username)).size.toString(),
                                    icon: Users,
                                    color: 'from-orange-500 to-red-500',
                                    bgColor: isDark ? 'bg-orange-900/20' : 'bg-orange-50'
                                }
                            ].map((stat, index) => {
                                const Icon = stat.icon;
                                return (
                                    <GlassCard
                                        key={stat.label}
                                        className={`text-center hover:scale-105 transition-all duration-300 ${stat.bgColor}`}
                                        hover={true}
                                        glow={true}
                                    >
                                        <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${stat.color} mb-3`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {stat.value}
                                        </div>
                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {stat.label}
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    </div>

                    {/* Enhanced Filter Controls */}
                    <GlassCard className="mb-8" padding="lg">
                        <div className="space-y-6">
                            {/* Search and View Toggle */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search by problem name..."
                                        className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-300 ${isDark
                                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                                            } focus:ring-2 focus:ring-blue-500/20`}
                                        value={problemName}
                                        onChange={(e) => setProblemName(e.target.value)}
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

                                    {/* View Mode Toggle */}
                                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                        {[
                                            { mode: 'timeline', icon: Activity, label: 'Timeline' },
                                            { mode: 'table', icon: List, label: 'Table' },
                                            { mode: 'analytics', icon: BarChart3, label: 'Analytics' }
                                        ].map(({ mode, icon: Icon, label }) => (
                                            <button
                                                key={mode}
                                                onClick={() => setViewMode(mode as any)}
                                                className={`p-2 transition-colors duration-200 ${viewMode === mode
                                                    ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                                                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                                title={label}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Expandable Filters */}
                            {showFilters && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Status
                                        </label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                } focus:ring-2 focus:ring-blue-500/20`}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="ACCEPTED">Accepted</option>
                                            <option value="WRONG_ANSWER">Wrong Answer</option>
                                            <option value="TIME_LIMIT_EXCEEDED">Time Limit Exceeded</option>
                                            <option value="RUNTIME_ERROR">Runtime Error</option>
                                            <option value="COMPILATION_ERROR">Compilation Error</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Language
                                        </label>
                                        <select
                                            value={languageFilter}
                                            onChange={(e) => setLanguageFilter(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                } focus:ring-2 focus:ring-blue-500/20`}
                                        >
                                            <option value="all">All Languages</option>
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="cpp">C++</option>
                                            <option value="java">Java</option>
                                        </select>
                                    </div>

                                    {isLoggedIn && (
                                        <div className="flex items-end">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                                                    checked={mySubmissionsOnly}
                                                    onChange={(e) => setMySubmissionsOnly(e.target.checked)}
                                                />
                                                <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    My submissions only
                                                </span>
                                            </label>
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2">
                                        <AnimatedButton
                                            onClick={fetchSubmissions}
                                            variant="primary"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            Apply Filters
                                        </AnimatedButton>
                                        <AnimatedButton
                                            onClick={resetFilters}
                                            variant="ghost"
                                            size="sm"
                                        >
                                            Reset
                                        </AnimatedButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Results Count */}
                    <div className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Showing {submissions.length} of {pagination.total} submissions
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 text-sm">
                                • {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
                            </span>
                        )}
                    </div>

                    {/* Dynamic Content Based on View Mode */}
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Skeleton key={index} className="h-20 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <GlassCard className="text-center py-12">
                            <AlertTriangle className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Error Loading Submissions
                            </h3>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                                {error}
                            </p>
                            <AnimatedButton
                                onClick={fetchSubmissions}
                                variant="primary"
                                icon={RefreshCw}
                            >
                                Try Again
                            </AnimatedButton>
                        </GlassCard>
                    ) : submissions.length === 0 ? (
                        <GlassCard className="text-center py-12">
                            <Code className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                No Submissions Found
                            </h3>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                                {activeFiltersCount > 0
                                    ? 'Try adjusting your filters to see more results.'
                                    : 'Start solving problems to see your submissions here!'
                                }
                            </p>
                            <AnimatedButton
                                href="/problems"
                                variant="primary"
                                icon={Code}
                            >
                                Solve Problems
                            </AnimatedButton>
                        </GlassCard>
                    ) : (
                        <>
                            {viewMode === 'timeline' && (
                                <GlassCard padding="lg">
                                    <Timeline items={getTimelineItems()} />
                                </GlassCard>
                            )}

                            {viewMode === 'analytics' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <GlassCard padding="lg">
                                        <SubmissionAnalytics
                                            data={getAnalyticsData()}
                                            title="Submission Status Distribution"
                                            totalSubmissions={submissions.length}
                                        />
                                    </GlassCard>

                                    {/* Additional analytics can go here */}
                                    <GlassCard padding="lg">
                                        <div className="text-center">
                                            <Calendar className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                More Analytics Coming Soon
                                            </h3>
                                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Advanced charts and insights are being developed.
                                            </p>
                                        </div>
                                    </GlassCard>
                                </div>
                            )}

                            {viewMode === 'table' && (
                                <GlassCard className="overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                                <tr>
                                                    {['Time', 'User', 'Problem', 'Language', 'Status', 'Runtime', 'Actions'].map((header) => (
                                                        <th key={header} className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                                {submissions.map((submission) => (
                                                    <tr key={submission.id} className={`transition-colors duration-200 ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {new Date(submission.submitted_at).toLocaleString()}
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                            <Link href={`/profile/${submission.username}`} className="hover:underline">
                                                                {submission.username}
                                                            </Link>
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                            <Link href={`/problems/${submission.problem_id}`} className="hover:underline">
                                                                {submission.problem_title || submission.problem_id}
                                                            </Link>
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {submission.language}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(submission.status)}`}>
                                                                {getStatusText(submission.status)}
                                                            </span>
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {submission.execution_time_ms > 0 ? `${submission.execution_time_ms}ms` : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <AnimatedButton
                                                                onClick={() => {
                                                                    setSelectedSubmission(submission);
                                                                    setShowDetailModal(true);
                                                                }}
                                                                variant="ghost"
                                                                size="sm"
                                                                icon={Eye}
                                                            >
                                                                View
                                                            </AnimatedButton>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </GlassCard>
                            )}
                        </>
                    )}

                    {/* Enhanced Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="mt-8 flex items-center justify-center">
                            <GlassCard className="inline-flex" padding="sm">
                                <div className="flex items-center gap-2">
                                    {/* ...existing pagination code with enhanced styling... */}
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </div>

                {/* Submission Detail Modal */}
                <SubmissionDetailModal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    submission={selectedSubmission}
                />
            </div>
        </>
    );
}
