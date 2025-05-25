import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProblemType, ApiError } from '@/types/problem'; // Adjust path

export default function SingleProblemPage() {
    const router = useRouter();
    const { problemId } = router.query; // problemId comes from the filename [problemId].tsx

    const [problem, setProblem] = useState<ProblemType | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!problemId) {
            // problemId might be undefined on initial render
            return;
        }

        const fetchProblem = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`http://localhost:8080/problems/${problemId}`);
                if (!response.ok) {
                    let errorMessage = `Failed to fetch problem: ${response.status}`;
                    try {
                        const errorData: ApiError = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (jsonError) {
                        // If response is not JSON, use the status text
                        errorMessage = response.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }
                const data: ProblemType = await response.json();
                setProblem(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                console.error(`Fetch problem ${problemId} error:`, err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProblem();
    }, [problemId]); // Re-run effect if problemId changes

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                <p className="text-xl text-gray-700">Loading problem details...</p>
                {/* You can add a spinner here */}
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                <p className="text-xl text-red-600 bg-red-100 p-4 rounded-md mb-4">Error: {error}</p>
                <Link href="/problems" legacyBehavior>
                    <a className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        Back to Problems
                    </a>
                </Link>
            </div>
        );
    }

    if (!problem) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                <p className="text-xl text-gray-700 mb-4">Problem not found.</p>
                <Link href="/problems" legacyBehavior>
                    <a className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        Back to Problems
                    </a>
                </Link>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{problem.title} - Online Judge</title>
            </Head>
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    {/* Back to problems link */}
                    <div className="mb-6">
                        <Link href="/problems" legacyBehavior>
                            <a className="text-indigo-600 hover:text-indigo-800 font-medium">
                                &larr; Back to Problems
                            </a>
                        </Link>
                    </div>

                    {/* Problem Header */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                        <div className="px-4 py-5 sm:px-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        {problem.problem_id ? `${problem.problem_id}. ` : ''}{problem.title}
                                    </h1>
                                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                        Difficulty: <span className={`font-semibold ${problem.difficulty?.toLowerCase() === 'easy' ? 'text-green-600' :
                                                problem.difficulty?.toLowerCase() === 'medium' ? 'text-yellow-600' :
                                                    problem.difficulty?.toLowerCase() === 'hard' ? 'text-red-600' : 'text-gray-600'
                                            }`}>{problem.difficulty || 'N/A'}</span>
                                    </p>
                                </div>
                                {/* Potentially a submit button or link to submission page here */}
                            </div>
                            {problem.tags && problem.tags.length > 0 && (
                                <div className="mt-3">
                                    {problem.tags.map(tag => (
                                        <span key={tag} className="mr-2 mb-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Problem Statement */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                        <div className="px-4 py-5 sm:p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-3">Problem Statement</h2>
                            {/* Use a markdown renderer here for better formatting if statement is in markdown */}
                            <div className="prose prose-indigo max-w-none" dangerouslySetInnerHTML={{ __html: problem.statement.replace(/\n/g, '<br />') /* Basic newline handling, consider markdown */ }} />
                        </div>
                    </div>

                    {/* Constraints and Limits */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                        <div className="px-4 py-5 sm:p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-3">Constraints & Limits</h2>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Input Constraints</dt>
                                    <dd className="mt-1 text-sm text-gray-900 prose max-w-none" dangerouslySetInnerHTML={{ __html: problem.constraints_text?.replace(/\n/g, '<br />') || 'N/A' }} />
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Time Limit</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{problem.time_limit_ms / 1000} seconds</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Memory Limit</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{problem.memory_limit_mb} MB</dd>
                                </div>
                                {problem.author && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Author</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{problem.author}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>

                    {/* TODO: Add section for Sample Test Cases (fetch separately or embed if small) */}
                    {/* TODO: Add code editor and submission area */}

                </div>
            </div>
        </>
    );
} 