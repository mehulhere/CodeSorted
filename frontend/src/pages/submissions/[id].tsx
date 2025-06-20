import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import '@/app/globals.css';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
} from "recharts"

// Define submission detail type
interface SubmissionDetail {
    id: string;
    user_id: string;
    username: string;
    problem_id: string;
    problem_title: string;
    language: string;
    code: string;
    status: string;
    execution_time_ms: number;
    memory_used_kb: number;
    submitted_at: string;
    test_cases_passed: number;
    test_cases_total: number;
    test_case_status: string;
    time_complexity: string;
    memory_complexity: string;
}

interface ProblemStats {
    total_accepted_submissions: number;
    time_complexity_distribution: { [key: string]: number };
    memory_complexity_distribution: { [key: string]: number };
}

// Order of complexities from best to worst
const complexityOrder = [
    "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)", "O(2^n)", "O(n!)"
];

const getRank = (complexity: string) => {
    const rank = complexityOrder.indexOf(complexity);
    return rank === -1 ? Infinity : rank;
};

const calculatePercentile = (userComplexity: string, distribution: { [key: string]: number }): number => {
    if (!userComplexity || !distribution) return 0;

    const userRank = getRank(userComplexity);
    let submissionsWithBetterOrEqualComplexity = 0;
    let totalSubmissions = 0;

    for (const complexity in distribution) {
        const count = distribution[complexity];
        totalSubmissions += count;
        if (getRank(complexity) <= userRank) {
            submissionsWithBetterOrEqualComplexity += count;
        }
    }

    if (totalSubmissions === 0) return 100;

    // Percentile: "Beats X% of submissions"
    const submissionsWithWorseComplexity = totalSubmissions - submissionsWithBetterOrEqualComplexity;
    const percentile = (submissionsWithWorseComplexity / totalSubmissions) * 100;

    return percentile;
};

export default function SubmissionDetailPage() {
    const router = useRouter();
    const { id } = router.query;

    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [stats, setStats] = useState<ProblemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Check if user is logged in
        const checkLoginStatus = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth-status`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsLoggedIn(data.isLoggedIn);
                    setIsAdmin(data.user?.isAdmin || false);
                } else {
                    setIsLoggedIn(false);
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Could not fetch auth status:", err);
                setIsLoggedIn(false);
                setIsAdmin(false);
            }
        };

        checkLoginStatus();
    }, []);

    useEffect(() => {
        if (!id) return;

        let intervalId: NodeJS.Timeout;

        const fetchSubmissionAndStats = async () => {
            try {
                // Fetch submission details
                const subResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/submissions/${id}`, {
                    credentials: 'include',
                });

                if (!subResponse.ok) {
                    const errorData = await subResponse.json();
                    throw new Error(errorData.message || `Failed to fetch submission with status: ${subResponse.status}`);
                }

                const subData: SubmissionDetail = await subResponse.json();
                setSubmission(subData);

                // If submission is accepted, fetch stats
                if (subData.status === "ACCEPTED" && subData.problem_id) {
                    const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/problems/${subData.problem_id}/stats`);
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        setStats(statsData);
                    }
                }

                // If the submission is still processing, set up polling
                if (subData.status === "PENDING" || subData.status === "PROCESSING") {
                    if (!intervalId) {
                        intervalId = setInterval(fetchSubmissionAndStats, 2000); // Poll every 2 seconds
                    }
                } else {
                    // Stop polling if processing is finished
                    if (intervalId) {
                        clearInterval(intervalId);
                    }
                    setLoading(false);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
                setLoading(false);
                if (intervalId) {
                    clearInterval(intervalId);
                }
            }
        };

        fetchSubmissionAndStats();

        // Cleanup function to clear interval on component unmount
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [id]);

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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACCEPTED':
                return '✅';
            case 'WRONG_ANSWER':
                return '❌';
            case 'TIME_LIMIT_EXCEEDED':
                return '⏱️';
            case 'MEMORY_LIMIT_EXCEEDED':
                return '📊';
            case 'RUNTIME_ERROR':
                return '💥';
            case 'COMPILATION_ERROR':
                return '🔧';
            case 'PENDING':
                return '⏳';
            default:
                return '❓';
        }
    };

    const getStatusDescription = (status: string) => {
        switch (status) {
            case 'ACCEPTED':
                return 'Your solution passed all test cases!';
            case 'WRONG_ANSWER':
                return 'Your solution produced incorrect output for one or more test cases.';
            case 'TIME_LIMIT_EXCEEDED':
                return 'Your solution took too long to execute.';
            case 'MEMORY_LIMIT_EXCEEDED':
                return 'Your solution used too much memory.';
            case 'RUNTIME_ERROR':
                return 'Your solution encountered an error during execution.';
            case 'COMPILATION_ERROR':
                return 'Your code failed to compile or had syntax errors.';
            case 'PENDING':
                return 'Your submission is being processed...';
            default:
                return 'Unknown status.';
        }
    };

    const getLanguageFormatted = (language: string) => {
        switch (language.toLowerCase()) {
            case 'python':
                return 'Python';
            case 'javascript':
                return 'JavaScript';
            case 'cpp':
                return 'C++';
            case 'java':
                return 'Java';
            default:
                return language;
        }
    };

    const getLanguageHighlight = (language: string) => {
        switch (language.toLowerCase()) {
            case 'python':
                return 'python';
            case 'javascript':
                return 'javascript';
            case 'cpp':
                return 'cpp';
            case 'java':
                return 'java';
            default:
                return 'plaintext';
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-100 flex justify-center items-center">Loading submission...</div>;
    }

    if (error) {
        return <div className="min-h-screen bg-gray-100 flex justify-center items-center text-red-500">Error: {error}</div>;
    }

    if (!submission) {
        return <div className="min-h-screen bg-gray-100 flex justify-center items-center">Submission not found.</div>;
    }

    const timePercentile = submission.time_complexity && stats ? calculatePercentile(submission.time_complexity, stats.time_complexity_distribution) : 0;
    const memoryPercentile = submission.memory_complexity && stats ? calculatePercentile(submission.memory_complexity, stats.memory_complexity_distribution) : 0;

    return (
        <>
            <Head>
                <title>Submission Details | OJ - Online Judge</title>
                <meta name="description" content="View submission details" />
            </Head>


            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center mb-6">
                    <Link href="/submissions" className="text-indigo-600 hover:text-indigo-800 mr-4">
                        ← Back to Submissions
                    </Link>
                    <h1 className="text-3xl font-bold text-white">Submission Details</h1>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white">{submission.problem_title}</h1>
                            <div className="mt-2">
                                <span
                                    className={`px-3 py-1 text-sm font-medium rounded-full ${submission.status === 'ACCEPTED' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                                        }`}
                                >
                                    {submission.status}
                                </span>
                                <span className="ml-4 text-gray-400">
                                    Submitted on {new Date(submission.submitted_at).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                            Editorial
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Runtime */}
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-400">Runtime</h3>
                            <p className="text-2xl font-semibold text-white">{submission.execution_time_ms} ms</p>
                            <p className="text-sm text-gray-500">Beats --.--%</p>
                        </div>
                        {/* Memory */}
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-400">Memory</h3>
                            <p className="text-2xl font-semibold text-white">{(submission.memory_used_kb / 1024).toFixed(2)} MB</p>
                            <p className="text-sm text-gray-500">Beats --.--%</p>
                        </div>
                        {/* Test Cases */}
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-400">Testcases</h3>
                            <p className="text-2xl font-semibold text-white">{submission.test_cases_passed} / {submission.test_cases_total}</p>
                            {submission.test_cases_passed === submission.test_cases_total && submission.test_cases_total > 0 ? (
                                <p className="text-sm text-green-500">All passed</p>
                            ) : (
                                <p className="text-sm text-red-500">{submission.test_cases_total - submission.test_cases_passed} failed</p>
                            )}
                        </div>
                    </div>

                    {/* Complexity Analysis */}
                    {submission.status === 'ACCEPTED' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <ComplexityAnalysis
                                title="Time Complexity"
                                userComplexity={submission.time_complexity}
                                percentile={timePercentile}
                                distribution={stats?.time_complexity_distribution}
                            />
                            <ComplexityAnalysis
                                title="Memory Complexity"
                                userComplexity={submission.memory_complexity}
                                percentile={memoryPercentile}
                                distribution={stats?.memory_complexity_distribution}
                            />
                        </div>
                    )}

                    {/* Code */}
                    <div className="bg-gray-900 rounded-lg">
                        <div className="px-4 py-2 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white">Code</h3>
                            <p className="text-sm text-gray-400">{submission.language}</p>
                        </div>
                        <div className="p-4">
                            <div className="bg-gray-50 rounded-md overflow-x-auto">
                                <pre className="p-4 text-sm text-gray-800 font-mono whitespace-pre">
                                    {submission.code}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

// New component for the complexity chart
const ComplexityAnalysis = ({ title, userComplexity, percentile, distribution }: {
    title: string,
    userComplexity: string,
    percentile: number,
    distribution: { [key: string]: number } | undefined
}) => {
    if (!userComplexity || !distribution) {
        return (
            <div className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-400 mb-2">{title}</h3>
                <p className="text-gray-500">Complexity analysis not available.</p>
            </div>
        );
    }

    const chartData = complexityOrder
        .filter(c => distribution[c] > 0)
        .map(c => ({
            name: c,
            count: distribution[c],
            isCurrentUser: c === userComplexity
        }));

    return (
        <div className="bg-gray-900 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <span className="text-sm text-gray-400">{userComplexity}</span>
            </div>
            <div className="text-left mb-4">
                <p className="text-3xl font-bold text-white">{percentile.toFixed(2)}%</p>
                <p className="text-sm text-gray-400">Beats percentile of submissions</p>
            </div>
            <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                borderColor: '#4b5563',
                                color: '#d1d5db',
                            }}
                        />
                        <Bar dataKey="count" fill="#4f46e5">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isCurrentUser ? '#818cf8' : '#4f46e5'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
} 