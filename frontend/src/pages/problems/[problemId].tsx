import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { ProblemType, ApiError } from '@/types/problem'; // Adjust path
import '@/app/globals.css';
import Editor, { Monaco } from '@monaco-editor/react';

export default function SingleProblemPage() {
    const router = useRouter();
    const { problemId } = router.query; // problemId comes from the filename [problemId].tsx

    const [problem, setProblem] = useState<ProblemType | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState<string>('// Start coding here...');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
    const editorRef = useRef<any>(null);

    // New state for code execution results
    const [output, setOutput] = useState<any>(null); // To store { stdout, stderr, status, execution_time_ms, error }
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [executionError, setExecutionError] = useState<string | null>(null);

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

    function handleEditorDidMount(editor: any, monaco: Monaco) {
        editorRef.current = editor;
        console.log('Monaco editor mounted:', editor);
        console.log('Monaco instance:', monaco);
    }

    function handleEditorChange(value: string | undefined) {
        setCode(value || '');
    }

    const handleRunCode = async () => {
        if (isExecuting) return;

        setIsExecuting(true);
        setOutput(null);
        setExecutionError(null);

        try {
            const response = await fetch('http://localhost:8080/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    language: selectedLanguage,
                    code: code,
                    stdin: '',
                }),
            });

            // Try to parse the JSON body regardless of response.ok status,
            // as even errors might come with a JSON body.
            let responseBody;
            try {
                responseBody = await response.json();
            } catch (jsonParseError) {
                // If JSON parsing fails, and response was not ok, throw a generic error.
                // If response was ok but JSON parsing failed, that's a different issue.
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}. Response body was not valid JSON.`);
                }
                // If response.ok but JSON is bad, this is a server issue.
                throw new Error('Received OK status, but response body was not valid JSON.');
            }

            if (!response.ok) {
                // If response was not OK, use message/error from the parsed JSON body if available.
                // These are for errors caught by sendJSONError in Go (e.g. bad request, server internal error before exec)
                throw new Error(responseBody.message || responseBody.error || `Request failed with status ${response.status}`);
            }

            // If response.ok, responseBody contains the execution result.
            // This includes successful runs, or runs where the user's code had errors (syntax, runtime).
            setOutput(responseBody);

        } catch (err) {
            // This catch handles:
            // 1. Network errors (fetch itself fails).
            // 2. response.json() parsing errors.
            // 3. Errors explicitly thrown from `if (!response.ok)`.
            console.error('Failed to execute code:', err);
            setExecutionError(err instanceof Error ? err.message : 'An unknown error occurred during execution.');
            setOutput(null); // Clear any partial output
        } finally {
            setIsExecuting(false);
        }
    };

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
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Problem Details */}
                    <div className="md:col-span-1">
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
                                <div className="prose prose-indigo max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: problem.statement.replace(/\n/g, '<br />') }} />
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

                        {/* Sample Test Cases Section */}
                        {problem.sample_test_cases && problem.sample_test_cases.length > 0 && (
                            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                                <div className="px-4 py-5 sm:p-6">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Sample Test Cases</h2>
                                    {problem.sample_test_cases.map((tc, index) => (
                                        <div key={tc.id || `sample-${index}`} className="mb-6 pb-4 border-b border-gray-200 last:mb-0 last:border-b-0">
                                            <h3 className="text-md font-semibold text-gray-700 mb-1">Sample Case {index + 1}</h3>
                                            {tc.notes && <p className="text-sm text-gray-500 mb-2 italic">{tc.notes}</p>}
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Input:</p>
                                                <pre className="mt-1 p-3 bg-gray-100 text-gray-800 rounded-md text-sm whitespace-pre-wrap">{tc.input}</pre>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-sm font-medium text-gray-600">Expected Output:</p>
                                                <pre className="mt-1 p-3 bg-gray-100 text-gray-800 rounded-md text-sm whitespace-pre-wrap">{tc.expected_output}</pre>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Code Editor and Actions */}
                    <div className="md:col-span-1 flex flex-col">
                        <div className="bg-white shadow sm:rounded-lg flex-grow flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <div className="flex items-center">
                                    <label htmlFor="language" className="sr-only">Language</label>
                                    <select
                                        id="language"
                                        name="language"
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2 text-base text-gray-900 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                        <option value="java">Java</option>
                                        <option value="csharp">C#</option>
                                        <option value="cpp">C++</option>
                                        <option value="go">Go</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex-grow" style={{ minHeight: '400px' }}>
                                <Editor
                                    height="100%"
                                    language={selectedLanguage}
                                    value={code}
                                    onChange={handleEditorChange}
                                    onMount={handleEditorDidMount}
                                    theme="vs-dark"
                                    options={{
                                        selectOnLineNumbers: true,
                                        minimap: { enabled: true },
                                        fontSize: 14,
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end items-center space-x-3">
                                <button
                                    type="button"
                                    onClick={handleRunCode}
                                    disabled={isExecuting}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                    {isExecuting ? 'Running...' : 'Run Code'}
                                </button>
                                <button
                                    type="button"
                                    // onClick={handleSubmitCode} // TODO: Implement submit
                                    disabled // TODO: Enable when submit is implemented
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>

                        {/* Output/Results Panel */}
                        <div className="mt-4 bg-white shadow sm:rounded-lg p-4">
                            <h3 className="text-lg font-medium text-gray-900">Output</h3>
                            {isExecuting && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Running code...
                                </div>
                            )}
                            {executionError && (
                                <div className="mt-2 p-3 rounded-md bg-red-50 text-red-700">
                                    <p className="font-semibold">Error:</p>
                                    <pre className="whitespace-pre-wrap">{executionError}</pre>
                                </div>
                            )}
                            {output && !isExecuting && (
                                <div className="mt-2 space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            Status: <span className={`font-bold ${output.status === 'success' ? 'text-green-600' :
                                                output.status === 'pending_implementation' ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>{output.status?.replace(/_/g, ' ') || 'N/A'}</span>
                                        </p>
                                        {output.execution_time_ms !== undefined && (
                                            <p className="text-sm text-gray-500">
                                                Time: {output.execution_time_ms} ms
                                            </p>
                                        )}
                                    </div>

                                    {output.error && output.status !== 'success' && ( // Backend job error
                                        <div>
                                            <p className="text-sm font-medium text-red-700">Execution Service Error:</p>
                                            <pre className="text-xs bg-gray-800 text-white p-2 rounded-md whitespace-pre-wrap">{output.error}</pre>
                                        </div>
                                    )}

                                    {output.stdout && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Stdout:</p>
                                            <pre className="text-xs bg-gray-800 text-white p-2 rounded-md whitespace-pre-wrap">{output.stdout}</pre>
                                        </div>
                                    )}
                                    {output.stderr && (
                                        <div>
                                            <p className="text-sm font-medium text-red-700">Stderr:</p>
                                            <pre className="text-xs bg-gray-800 text-white p-2 rounded-md whitespace-pre-wrap">{output.stderr}</pre>
                                        </div>
                                    )}
                                    {!output.stdout && !output.stderr && output.status === 'success' && (
                                        <p className="text-sm text-gray-500">No output (stdout/stderr).</p>
                                    )}
                                </div>
                            )}
                            {!output && !isExecuting && !executionError && (
                                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md min-h-[100px]">
                                    <pre>// Click "Run Code" to see output</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 