import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProblemListItemType, ApiError } from '@/types/problem'; // Adjust path if needed
import '@/app/globals.css';

export default function ProblemsPage() {
    const [problems, setProblems] = useState<ProblemListItemType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProblems = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('http://localhost:8080/problems'); // Your backend URL
                if (!response.ok) {
                    const errorData: ApiError = await response.json();
                    throw new Error(errorData.message || `Failed to fetch problems: ${response.status}`);
                }
                const data: ProblemListItemType[] = await response.json();
                setProblems(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                console.error("Fetch problems error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProblems();
    }, []);

    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy':
                return 'bg-green-100 text-green-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'hard':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                <p className="text-xl text-gray-700">Loading problems...</p>
                {/* You can add a spinner here */}
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                <p className="text-xl text-red-600 bg-red-100 p-4 rounded-md">Error: {error}</p>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Problems - Online Judge</title>
            </Head>
            <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
                        Problem Set
                    </h1>

                    {problems.length === 0 && !isLoading && (
                        <p className="text-center text-gray-600 text-lg">No problems available at the moment. Check back later!</p>
                    )}

                    {problems.length > 0 && (
                        <div className="bg-white shadow overflow-hidden sm:rounded-md">
                            <ul role="list" className="divide-y divide-gray-200">
                                {problems.map((problem) => (
                                    <li key={problem.id}>
                                        {/* Use problem.problem_id if that's your intended URL slug, or problem.id (MongoDB _id) */}
                                        <Link href={`/problems/${problem.problem_id || problem.id}`} legacyBehavior>
                                            <a className="block hover:bg-gray-50">
                                                <div className="px-4 py-4 sm:px-6">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-lg font-medium text-indigo-600 truncate">
                                                            {problem.problem_id ? `${problem.problem_id}. ` : ''}{problem.title}
                                                        </p>
                                                        <div className="ml-2 flex-shrink-0 flex">
                                                            <p
                                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyClass(
                                                                    problem.difficulty
                                                                )}`}
                                                            >
                                                                {problem.difficulty || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {problem.tags && problem.tags.length > 0 && (
                                                        <div className="mt-2 sm:flex sm:justify-between">
                                                            <div className="sm:flex">
                                                                <p className="flex items-center text-sm text-gray-500">
                                                                    Tags: {problem.tags.join(', ')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </a>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 