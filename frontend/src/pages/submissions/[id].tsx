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
    problem_id: string;
    problem_title: string;
    user_id: string;
    username: string;
    language: string;
    code: string;
    status: string;
    execution_time_ms: number;
    memory_used_kb: number;
    test_cases_passed: number;
    test_cases_total: number;
    submitted_at: string;
    time_complexity?: string;
    memory_complexity?: string;
    failed_test_case_details?: {
        input: string;
        expected_output: string;
        actual_output: string;
        error?: string;
    };
    test_case_status?: string;
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

interface ComplexityAnalysisProps {
    title: string;
    userComplexity: string;
    percentile: number;
    distribution: { [key: string]: number } | undefined;
}

const formatTestCaseInput = (input: string): string => {
    try {
        const parsedInput = JSON.parse(input);
        if (typeof parsedInput === 'object' && parsedInput !== null) {
            return Object.entries(parsedInput)
                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                .join('\n');
        }
        return String(parsedInput);
    } catch (error) {
        return input;
    }
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
            case 'PROCESSING':
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
            case 'PROCESSING':
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
            case 'PROCESSING':
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

    if (!isLoggedIn && submission && submission.username !== 'Guest') {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-6">This submission belongs to another user. Please <Link href="/login" className="text-indigo-600 hover:underline">log in</Link> to view your own submissions.</p>
                    <Link href="/problems" passHref>
                        <button className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                            Back to Problems
                        </button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Head>
                <title>Submission Details - {submission.problem_title}</title>
            </Head>
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <Link href={`/submissions?problemId=${submission.problem_id}`} legacyBehavior>
                        <a className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            &larr; Back to Submissions
                        </a>
                    </Link>
                </div>
            </header>
            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center space-x-4">
                                    <h1 className="text-3xl font-bold text-gray-900">{submission.problem_title}</h1>
                                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusClass(submission.status)}`}>
                                        {submission.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    {submission.status === "ACCEPTED" && (
                                        <Link href={`/problems/${submission.problem_id}`} passHref>
                                            <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                                                Editorial
                                            </button>
                                        </Link>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => router.push(`/admin/problems/${submission.problem_id}`)}
                                            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800"
                                        >
                                            Admin View
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">
                                Submitted by <Link href={`/profile/${submission.username}`} className="font-medium text-indigo-600 hover:underline">{submission.username}</Link> on {formatDate(submission.submitted_at)}
                            </p>
                        </div>

                        {/* Status Banner */}
                        <div className="p-6">
                            <div className={`p-4 rounded-lg flex items-center ${getStatusClass(submission.status)}`}>
                                <span className="text-2xl mr-4">{getStatusIcon(submission.status)}</span>
                                <div>
                                    <h2 className="font-bold text-lg">{submission.status.replace('_', ' ')}</h2>
                                    <p className="text-sm">{getStatusDescription(submission.status)}</p>
                                </div>
                            </div>
                        </div>

                        {/* First Failed Test Case */}
                        {submission.status !== "ACCEPTED" && submission.status !== "PENDING" && submission.failed_test_case_details && (
                            <div className="p-6 border-t border-gray-200">
                                <h2 className="text-xl font-semibold mb-4 text-gray-800">First Failed Test Case</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-gray-600 mb-2">Input</h3>
                                        <pre className="text-sm font-mono bg-white p-3 rounded-md border text-gray-800 whitespace-pre-wrap">{formatTestCaseInput(submission.failed_test_case_details.input)}</pre>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-gray-600 mb-2">Expected Output</h3>
                                        <pre className="text-sm font-mono bg-white p-3 rounded-md border text-gray-800 whitespace-pre-wrap">{submission.failed_test_case_details.expected_output}</pre>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                        <h3 className="text-sm font-medium text-red-700 mb-2">Your Output / Error</h3>
                                        <pre className="text-sm font-mono bg-white p-3 rounded-md border text-red-800 whitespace-pre-wrap">{submission.failed_test_case_details.actual_output}</pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Content Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                            {/* Left side: Metrics */}
                            <div className="col-span-1">
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Metrics</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="text-sm font-medium text-gray-600 mb-2">Runtime</h3>
                                            <p className="text-2xl font-semibold text-gray-800">{submission.execution_time_ms} ms</p>
                                            <p className="text-sm text-gray-600">Beats --.--%</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="text-sm font-medium text-gray-600 mb-2">Memory</h3>
                                            <p className="text-2xl font-semibold text-gray-800">{(submission.memory_used_kb / 1024).toFixed(2)} MB</p>
                                            <p className="text-sm text-gray-600">Beats --.--%</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="text-sm font-medium text-gray-600 mb-2">Testcases</h3>
                                            <p className="text-2xl font-semibold text-gray-800">{submission.test_cases_passed} / {submission.test_cases_total}</p>
                                            {submission.test_cases_passed === submission.test_cases_total && submission.test_cases_total > 0 ? (
                                                <p className="text-sm text-green-600">All passed</p>
                                            ) : (
                                                <p className="text-sm text-red-600">{submission.test_cases_total - submission.test_cases_passed} failed</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right side: Code and Complexity Analysis */}
                            <div className="col-span-2">
                                {/* Code */}
                                <div className="bg-white rounded-lg shadow-md mb-6">
                                    <div className="p-4 border-b border-gray-200">
                                        <h2 className="text-xl font-semibold text-gray-800">Code</h2>
                                        <p className="text-sm text-gray-600">{submission.language}</p>
                                    </div>
                                    <div className="p-4">
                                        <div className="bg-gray-50 rounded-md overflow-x-auto">
                                            <pre className="p-4 text-sm text-gray-800 font-mono whitespace-pre">
                                                {submission.code}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                {/* Failed Test Case Details */}
                                {submission.status !== 'ACCEPTED' && submission.failed_test_case_details && (
                                    <div className="bg-white rounded-lg shadow-md mt-6">
                                        <div className="p-4 border-b border-gray-200">
                                            <h2 className="text-xl font-semibold text-red-600">Failed Test Case</h2>
                                        </div>
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h3 className="font-semibold text-gray-700 mb-2">Input</h3>
                                                <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{formatTestCaseInput(submission.failed_test_case_details.input)}</pre>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h3 className="font-semibold text-gray-700 mb-2">Expected Output</h3>
                                                <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{submission.failed_test_case_details.expected_output}</pre>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h3 className="font-semibold text-gray-700 mb-2">Your Output</h3>
                                                <pre className="text-sm text-red-600 font-mono whitespace-pre-wrap">
                                                    {submission.failed_test_case_details.error || submission.failed_test_case_details.actual_output}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Complexity Analysis */}
                                {submission.status === 'ACCEPTED' && submission.time_complexity && submission.memory_complexity && stats && (
                                    <div className="bg-white rounded-lg shadow-md">
                                        <div className="p-4 border-b border-gray-200">
                                            <h2 className="text-xl font-semibold text-gray-800">Complexity Analysis</h2>
                                            <p className="text-sm text-gray-600">AI-generated complexity analysis of your accepted solution.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
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
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// New component for the complexity chart
const ComplexityAnalysis: React.FC<ComplexityAnalysisProps> = ({ title, userComplexity, percentile, distribution }) => {
    if (!userComplexity || !distribution) {
        return (
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>
                <p className="text-gray-600">Complexity analysis not available.</p>
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
        <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                <span className="text-sm font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">{userComplexity}</span>
            </div>
            <div className="text-left mb-4">
                <p className="text-3xl font-bold text-gray-800">{percentile.toFixed(2)}%</p>
                <p className="text-sm text-gray-600">Beats percentile of submissions</p>
            </div>
            <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd' }}
                            labelStyle={{ color: '#333' }}
                        />
                        <Bar dataKey="count" name="Submissions">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isCurrentUser ? '#4f46e5' : '#a5b4fc'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}; 