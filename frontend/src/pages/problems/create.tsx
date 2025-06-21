import '@/app/globals.css';
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader, MessageSquare, Lightbulb } from 'lucide-react';
import {
    createProblem,
    generateTestCases,
    bulkAddTestCases,
    getAuthStatus,
    generateProblemDetails,
    ProblemDetails,
    executeCode
} from '@/lib/api';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// Define types for API responses
interface AuthStatusResponse {
    isLoggedIn: boolean;
    user?: {
        id: string;
        username: string;
        email: string;
        isAdmin: boolean;
    };
}

interface TestCase {
    input: string;
    output: string;
}

interface GenerateTestCasesResponse {
    test_cases: Record<string, TestCase>;
}

interface CreateProblemResponse {
    id: string;
    problem_id: string;
}

interface ExecuteCodeResponse {
    stdout: string;
    stderr: string;
    status: string;
    execution_time_ms: number;
    results?: Array<{
        stdout: string;
        stderr: string;
        status: string;
        execution_time_ms: number;
    }>;
}

type ExecutionResult = {
    stdout: string;
    stderr: string;
    status: string;
    executionTimeMs: number;
} | null;

export default function CreateProblemPage() {
    const router = useRouter();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Problem creation state
    const [rawProblemStatement, setRawProblemStatement] = useState('');
    const [problemDetails, setProblemDetails] = useState<ProblemDetails | null>(null);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [problemView, setProblemView] = useState<'input' | 'preview'>('input');

    // Test case generation state
    const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
    const [generatedTestCases, setGeneratedTestCases] = useState<Record<string, TestCase> | null>(null);
    const [testCaseError, setTestCaseError] = useState<string | null>(null);
    const [selectedSampleCount, setSelectedSampleCount] = useState(5);

    // Problem creation state
    const [isCreatingProblem, setIsCreatingProblem] = useState(false);
    const [createdProblemId, setCreatedProblemId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Editor state
    const [code, setCode] = useState<string>('// Start coding here...');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('python');

    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Test case state
    const [testCases, setTestCases] = useState<{ input: string; expectedOutput: string }[]>([
        { input: '', expectedOutput: '' },
    ]);
    const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [executionResult, setExecutionResult] = useState<ExecutionResult>(null);
    const [allExecutionResults, setAllExecutionResults] = useState<ExecutionResult[] | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [formattedInput, setFormattedInput] = useState('');

    // Check authentication status
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const response = await getAuthStatus() as AuthStatusResponse;
                setIsLoggedIn(response.isLoggedIn);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to check auth status:', err);
                setIsLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    // Effect to update UI test cases when generated cases or sample count changes
    useEffect(() => {
        if (generatedTestCases && Object.keys(generatedTestCases).length > 0) {
            const testCaseEntries = Object.entries(generatedTestCases);

            // Sort based on the number in the key "test_case_X"
            testCaseEntries.sort(([keyA], [keyB]) => {
                const numA = parseInt(keyA.split('_').pop() || '0');
                const numB = parseInt(keyB.split('_').pop() || '0');
                return numA - numB;
            });

            const allGeneratedCases = testCaseEntries.map(([, tc]) => ({
                input: tc.input,
                expectedOutput: (tc.output || '').trim(),
            }));

            const sampleCases = allGeneratedCases.slice(0, selectedSampleCount);
            setTestCases(sampleCases);

            // Reset active index if it's out of bounds
            if (activeTestCaseIndex >= sampleCases.length) {
                setActiveTestCaseIndex(Math.max(0, sampleCases.length - 1));
            }
        }
    }, [generatedTestCases, selectedSampleCount]);

    // Effect to update formatted input for the editor
    useEffect(() => {
        const currentInput = testCases[activeTestCaseIndex]?.input || '';
        setFormattedInput(formatDisplayInput(currentInput));
    }, [activeTestCaseIndex, testCases]);

    function handleEditorDidMount(editor: editor.IStandaloneCodeEditor) {
        editorRef.current = editor;
    }

    function handleEditorChange(value: string | undefined) {
        setCode(value || '');
    }

    const handleLanguageChange = (value: string) => {
        if (code.trim() !== '' && code.trim() !== 'Start coding here...') {
            // Check for specific language confirmation
            const confirmMessage = `You have existing code. Switching to ${value} will clear your current code. Continue?`;
            if (!confirm(confirmMessage)) {
                return; // Don't change if user cancels
            }
        }
        setSelectedLanguage(value);
        setCode('// Start coding here...');
    };

    const handleGenerateProblemDetails = async () => {
        if (!rawProblemStatement) {
            setError('Please enter a problem statement first');
            return;
        }

        setIsGeneratingDetails(true);
        setError(null);

        try {
            const details = await generateProblemDetails(rawProblemStatement);
            setProblemDetails(details);
            setProblemView('preview');

            // Now automatically generate test cases
            setIsGeneratingTestCases(true);
            try {
                const response = await generateTestCases(
                    details.formatted_statement,
                    details.constraints,
                    details.problem_id
                ) as GenerateTestCasesResponse;
                setGeneratedTestCases(response.test_cases);
            } catch (err) {
                console.error('Failed to generate test cases:', err);
                setTestCaseError('Failed to generate test cases. You can still create the problem.');
            } finally {
                setIsGeneratingTestCases(false);
            }
        } catch (err) {
            console.error('Failed to generate problem details:', err);
            setError('Failed to generate problem details. Please try again or refine your problem statement.');
        } finally {
            setIsGeneratingDetails(false);
        }
    };

    const handleCreateProblem = async () => {
        if (!problemDetails) {
            setError('Please generate problem details first');
            return;
        }

        setIsCreatingProblem(true);
        setError(null);

        try {
            const problemData = {
                problem_id: problemDetails.problem_id,
                title: problemDetails.title,
                difficulty: problemDetails.difficulty,
                statement: problemDetails.formatted_statement,
                constraints_text: problemDetails.constraints,
                time_limit_ms: 1000, // Default
                memory_limit_mb: 128, // Default
                tags: problemDetails.tags
            };

            const response = await createProblem(problemData) as CreateProblemResponse;
            setCreatedProblemId(response.id);

            // If we have generated test cases, add them
            if (generatedTestCases && Object.keys(generatedTestCases).length > 0) {
                await bulkAddTestCases(response.id, generatedTestCases, selectedSampleCount);
            }

            // Show success message and redirect after a delay
            setTimeout(() => {
                router.push(`/problems/${problemDetails.problem_id}`);
            }, 2000);
        } catch (err) {
            console.error('Failed to create problem:', err);
            setError('Failed to create problem. Please try again.');
        } finally {
            setIsCreatingProblem(false);
        }
    };

    // Handle executing code against test case
    const handleRunCode = async () => {
        if (!editorRef.current) return;

        // Get the current code from the editor
        const currentCode = editorRef.current.getValue();
        if (!currentCode.trim()) {
            setExecutionError("Code cannot be empty");
            return;
        }

        const inputs = testCases.map(tc => tc.input);
        if (inputs.length === 0) {
            setExecutionError("No test cases to run against");
            return;
        }

        if (!problemDetails?.problem_id) {
            setExecutionError("Problem details must be generated before running code.");
            return;
        }

        setIsExecuting(true);
        setExecutionError(null);
        setExecutionResult(null);

        try {
            const response = await executeCode(
                selectedLanguage,
                currentCode,
                inputs,
                problemDetails.problem_id
            ) as ExecuteCodeResponse;

            if (response.results && response.results.length > 0) {
                // Since we now run all test cases, we display results for each one.
                // We'll store the whole response and process it in the render logic.
                const processedResults = response.results.map(res => ({
                    stdout: res.stdout,
                    stderr: res.stderr,
                    status: res.status,
                    executionTimeMs: res.execution_time_ms
                }));
                // For now, let's just handle one result display, but with multiple results available.
                // We will create a new state to hold all results.
                setAllExecutionResults(processedResults);
                setExecutionResult(processedResults[activeTestCaseIndex]);
            } else {
                setExecutionError("No execution results returned");
            }
        } catch (error) {
            console.error("Error executing code:", error);
            setExecutionError(error instanceof Error ? error.message : "Failed to execute code");
        } finally {
            setIsExecuting(false);
        }
    };

    // If not logged in, show access denied
    if (!isLoading && !isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-4">You must be logged in to create problems.</p>
                <Button onClick={() => router.push('/login')} className="bg-indigo-600 hover:bg-indigo-700">
                    Log In
                </Button>
            </div>
        );
    }

    // If loading, show loading spinner
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                <Loader className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-700">Loading...</span>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Create Problem - Online Judge</title>
            </Head>
            <div className="min-h-screen bg-gray-100">
                <ResizablePanelGroup direction="horizontal" className="min-h-screen">
                    {/* Left Panel: Problem Description */}
                    <ResizablePanel defaultSize={40} minSize={30}>
                        <div className="h-screen flex flex-col bg-white border-r border-gray-200">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-xl font-bold text-gray-900">Create New Problem</h1>
                                    {problemView === 'preview' && problemDetails && (
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${problemDetails.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                                problemDetails.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {problemDetails.difficulty}
                                            </span>
                                            {problemDetails.tags.slice(0, 3).map((tag, index) => (
                                                <span key={index} className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tab Navigation - only shown in preview mode */}
                            {problemView === 'preview' && (
                                <div className="border-b border-gray-200">
                                    <div className="flex">
                                        <button
                                            className="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600"
                                        >
                                            Description
                                        </button>
                                        <button
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                        >
                                            <MessageSquare className="inline-block w-4 h-4 mr-1" />
                                            Discussion
                                        </button>
                                        <button
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                        >
                                            Submissions
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Problem Input or Preview */}
                            <div className="overflow-y-auto flex-grow p-4">
                                {problemView === 'input' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="rawProblemStatement" className="block text-lg font-semibold text-gray-800 mb-2">
                                                Enter Problem Statement
                                            </label>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Describe your problem, including the task, examples, and constraints if possible.
                                                The AI will help structure and format it properly.
                                            </p>
                                            <Textarea
                                                id="rawProblemStatement"
                                                value={rawProblemStatement}
                                                onChange={(e) => setRawProblemStatement(e.target.value)}
                                                placeholder="Given an array of integers, return indices of the two numbers such that they add up to a specific target.
                                                
Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] = 2 + 7 = 9, we return [0, 1].

Constraints:
2 <= nums.length <= 10^4
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9
Only one valid answer exists."
                                                className="w-full min-h-[400px] font-mono text-sm"
                                            />
                                        </div>

                                        <Button
                                            onClick={handleGenerateProblemDetails}
                                            disabled={isGeneratingDetails || !rawProblemStatement}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            {isGeneratingDetails ? (
                                                <>
                                                    <Loader className="mr-2 h-4 w-4 animate-spin" /> Generating Problem...
                                                </>
                                            ) : (
                                                'Generate Problem'
                                            )}
                                        </Button>

                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
                                                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                                                <p>{error}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Problem Preview */}
                                        <div className="flex justify-between items-center mb-2">
                                            <h2 className="text-lg font-semibold text-gray-800">Problem Preview</h2>
                                            <Button
                                                onClick={() => setProblemView('input')}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Edit Original
                                            </Button>
                                        </div>

                                        {problemDetails && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h1 className="text-2xl font-bold text-gray-900">{problemDetails.title}</h1>
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${problemDetails.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                                            problemDetails.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                            {problemDetails.difficulty}
                                                        </span>
                                                        {problemDetails.tags.map((tag, index) => (
                                                            <span key={index} className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <div className="prose prose-indigo max-w-none text-gray-800">
                                                        {/* Format the problem statement more cleanly */}
                                                        <p>{problemDetails.formatted_statement.split('\n\n')[0]}</p>

                                                        {/* Examples Section */}
                                                        <h2 className="text-lg font-semibold mt-6 mb-3">Examples</h2>

                                                        {/* Parse and format examples from the formatted statement */}
                                                        <div className="space-y-4">
                                                            {parseExamples(problemDetails.formatted_statement).map((example, idx) => (
                                                                <div key={idx} className="border border-gray-200 rounded-md overflow-hidden">
                                                                    <h3 className="text-sm font-medium text-gray-700 p-3 border-b border-gray-200 bg-gray-50">Example {idx + 1}:</h3>
                                                                    <div className="p-3">
                                                                        <div className="mb-2">
                                                                            <div className="text-xs font-medium text-gray-600 mb-1">Input:</div>
                                                                            <div className="bg-gray-800 text-white p-2 rounded text-sm font-mono">{example.input}</div>
                                                                        </div>
                                                                        <div className="mb-2">
                                                                            <div className="text-xs font-medium text-gray-600 mb-1">Output:</div>
                                                                            <div className="bg-gray-800 text-white p-2 rounded text-sm font-mono">{example.output}</div>
                                                                        </div>
                                                                        {example.explanation && (
                                                                            <div>
                                                                                <div className="text-xs font-medium text-gray-600 mb-1">Explanation:</div>
                                                                                <div className="text-sm text-gray-700">{example.explanation}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Constraints</h2>
                                                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                            {problemDetails.constraints.split('\n').filter(c => c.trim()).map((constraint, idx) => (
                                                                <li key={idx} className="text-sm font-mono">{constraint}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                                            <p className="text-sm font-medium text-gray-700">Time Limit</p>
                                                            <p className="text-sm text-gray-900">1 second</p>
                                                        </div>
                                                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                                            <p className="text-sm font-medium text-gray-700">Memory Limit</p>
                                                            <p className="text-sm text-gray-900">256 MB</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Test Cases</h2>
                                                    {isGeneratingTestCases ? (
                                                        <div className="flex items-center space-x-2 text-gray-600">
                                                            <Loader className="h-4 w-4 animate-spin" />
                                                            <span>Generating test cases...</span>
                                                        </div>
                                                    ) : testCaseError ? (
                                                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
                                                            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                                                            <p>{testCaseError}</p>
                                                        </div>
                                                    ) : generatedTestCases ? (
                                                        <div>
                                                            <div className="flex items-center mb-4">
                                                                <label htmlFor="sampleCount" className="block text-sm font-medium text-gray-700 mr-2">
                                                                    Number of Sample Test Cases:
                                                                </label>
                                                                <Select value={selectedSampleCount.toString()} onValueChange={(value) => setSelectedSampleCount(parseInt(value))}>
                                                                    <SelectTrigger className="w-20">
                                                                        <SelectValue placeholder="Samples" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {[0, 1, 2, 3, 4, 5].map((count) => (
                                                                            <SelectItem key={count} value={count.toString()}>
                                                                                {count}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                                                <p className="text-sm text-gray-700">
                                                                    <span className="font-medium">{Object.keys(generatedTestCases).length}</span> test cases generated
                                                                    (<span className="font-medium">{selectedSampleCount}</span> will be visible to users)
                                                                </p>
                                                            </div>

                                                            {/* Display Sample Test Cases */}
                                                            <div className="mt-4 space-y-2">
                                                                {testCases.map((tc, index) => (
                                                                    <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                                                                        <div className="p-3 bg-gray-50 border-b">
                                                                            <h4 className="text-sm font-medium text-gray-800">Sample Case {index + 1}</h4>
                                                                        </div>
                                                                        <div className="p-3 space-y-2">
                                                                            <div>
                                                                                <div className="text-xs font-medium text-gray-600 mb-1">Input:</div>
                                                                                <div className="bg-gray-800 text-white p-2 rounded text-sm font-mono whitespace-pre-wrap">{formatDisplayInput(tc.input)}</div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-xs font-medium text-gray-600 mb-1">Expected Output:</div>
                                                                                <div className="bg-gray-800 text-white p-2 rounded text-sm font-mono whitespace-pre-wrap">{tc.expectedOutput}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-600">No test cases generated yet</p>
                                                    )}
                                                </div>

                                                <Button
                                                    onClick={handleCreateProblem}
                                                    disabled={isCreatingProblem}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    {isCreatingProblem ? (
                                                        <>
                                                            <Loader className="mr-2 h-4 w-4 animate-spin" /> Creating Problem...
                                                        </>
                                                    ) : (
                                                        'Create Problem'
                                                    )}
                                                </Button>

                                                {createdProblemId && (
                                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 flex items-start">
                                                        <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-medium">Problem created successfully!</p>
                                                            <p className="text-sm">Redirecting to the problem page...</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {error && (
                                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
                                                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                                                        <p>{error}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel: Code Editor */}
                    <ResizablePanel defaultSize={60} minSize={40}>
                        <div className="h-screen flex flex-col bg-white">
                            {/* Language Selector */}
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Select Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="python">Python</SelectItem>
                                            <SelectItem value="javascript">JavaScript</SelectItem>
                                            <SelectItem value="cpp">C++</SelectItem>
                                            <SelectItem value="java">Java</SelectItem>
                                            <SelectItem value="pseudocode">Pseudocode</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex space-x-2">
                                        <Button
                                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                            onClick={handleRunCode}
                                            disabled={isExecuting}
                                        >
                                            {isExecuting ? 'Running...' : 'Run'}
                                        </Button>
                                        <Button
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Submit
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-grow">
                                <ResizablePanelGroup direction="vertical">
                                    {/* Code Editor Panel */}
                                    <ResizablePanel defaultSize={65} minSize={40}>
                                        <div className="h-full flex flex-col">
                                            {/* Editor Tabs */}
                                            <div className="flex items-center px-4 py-2 bg-[#1e1e1e] border-b border-gray-800">
                                                <div className="flex">
                                                    <div className="px-3 py-1 text-xs bg-[#2d2d2d] text-gray-300 rounded-t border-t border-l border-r border-gray-700">
                                                        Editor
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-grow">
                                                <Editor
                                                    height="100%"
                                                    language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                                                    value={code}
                                                    onChange={handleEditorChange}
                                                    onMount={handleEditorDidMount}
                                                    theme="vs-dark"
                                                    options={{
                                                        minimap: { enabled: false },
                                                        scrollBeyondLastLine: false,
                                                        fontSize: 14,
                                                        lineNumbers: 'on',
                                                        roundedSelection: false,
                                                        scrollbar: {
                                                            vertical: 'visible',
                                                            horizontal: 'visible',
                                                        },
                                                        automaticLayout: true,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </ResizablePanel>

                                    <ResizableHandle withHandle />

                                    {/* Test Cases and Output Panel */}
                                    <ResizablePanel defaultSize={35} minSize={20}>
                                        <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-200">
                                            {/* Tabs */}
                                            <div className="h-10 bg-[#1e1e1e] border-b border-gray-800 flex items-center px-4">
                                                <div className="flex-grow overflow-x-auto whitespace-nowrap pr-4">
                                                    <div className="flex items-center">
                                                        {testCases.map((_, index) => (
                                                            <button
                                                                key={index}
                                                                className={`px-3 py-1 text-xs mr-2 rounded-full flex-shrink-0 relative ${activeTestCaseIndex === index ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                                                onClick={() => {
                                                                    setActiveTestCaseIndex(index);
                                                                    // Update the main execution result view when changing tabs
                                                                    if (allExecutionResults && allExecutionResults[index]) {
                                                                        setExecutionResult(allExecutionResults[index]);
                                                                    } else {
                                                                        setExecutionResult(null);
                                                                    }
                                                                }}
                                                            >
                                                                Case {index + 1}
                                                                {allExecutionResults && allExecutionResults[index] && (
                                                                    <span className={`absolute -top-1 -right-1 block h-2 w-2 rounded-full ${allExecutionResults[index].status === 'success' && testCases[index]?.expectedOutput.trim() === allExecutionResults[index].stdout.trim() ? 'bg-green-500' : 'bg-red-500'
                                                                        }`}></span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <button
                                                        className="px-3 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-full"
                                                        onClick={() => {
                                                            const newTestCases = [...testCases, { input: '', expectedOutput: '' }];
                                                            setTestCases(newTestCases);
                                                            setActiveTestCaseIndex(testCases.length);
                                                            // Also reset execution results for the new tab
                                                            if (allExecutionResults) {
                                                                setAllExecutionResults([...allExecutionResults, null]);
                                                            }
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Input/Output Area */}
                                            <div className="flex-grow grid grid-cols-2 gap-4 p-4 overflow-hidden min-h-[200px] bg-[#1e1e1e]">
                                                <div className="space-y-4">
                                                    {/* Input */}
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-medium text-gray-400 mb-1">Input:</p>
                                                        <textarea
                                                            className="p-2 text-sm font-mono border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-[#2d2d2d] text-gray-200 h-auto min-h-[40px] resize-y"
                                                            value={formattedInput}
                                                            onChange={(e) => setFormattedInput(e.target.value)}
                                                            onBlur={() => {
                                                                const newTestCases = [...testCases];
                                                                if (newTestCases[activeTestCaseIndex]) {
                                                                    newTestCases[activeTestCaseIndex].input = parseFormattedInput(formattedInput);
                                                                    setTestCases(newTestCases);
                                                                }
                                                            }}
                                                            rows={Math.max(2, (formattedInput || '').split('\n').length)}
                                                        />
                                                    </div>

                                                    {/* Expected Output */}
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-medium text-gray-400 mb-1">Expected Output:</p>
                                                        <textarea
                                                            className="p-2 text-sm font-mono border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-[#2d2d2d] text-gray-200 h-[40px]"
                                                            value={testCases[activeTestCaseIndex]?.expectedOutput || ''}
                                                            onChange={(e) => {
                                                                const newTestCases = [...testCases];
                                                                if (newTestCases[activeTestCaseIndex]) {
                                                                    newTestCases[activeTestCaseIndex].expectedOutput = e.target.value;
                                                                    setTestCases(newTestCases);
                                                                }
                                                            }}
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Output */}
                                                <div className="flex flex-col min-h-[20px]">
                                                    <p className="text-xs font-medium text-gray-400 mb-1">Output:</p>
                                                    <div className="h-[200px] flex-grow p-2 text-sm font-mono border border-gray-700 rounded-md bg-[#2d2d2d] overflow-auto whitespace-pre-wrap text-gray-200">
                                                        {isExecuting ? (
                                                            <div className="text-gray-400">Running code...</div>
                                                        ) : executionError ? (
                                                            <div className="text-red-400">{executionError}</div>
                                                        ) : executionResult ? (
                                                            (() => {
                                                                const activeTestCase = testCases[activeTestCaseIndex];
                                                                let statusText: React.ReactNode = 'Failed';
                                                                let statusColor = 'text-red-400';

                                                                if (executionResult.status === 'success') {
                                                                    const isCorrect = activeTestCase && executionResult.stdout.trim() === activeTestCase.expectedOutput.trim();
                                                                    if (isCorrect) {
                                                                        statusText = 'Accepted';
                                                                        statusColor = 'text-green-400';
                                                                    } else {
                                                                        statusText = 'Wrong Answer';
                                                                    }
                                                                } else if (executionResult.status) {
                                                                    statusText = executionResult.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                                                }

                                                                return (
                                                                    <div className="space-y-2">
                                                                        {/* Output */}
                                                                        <div>
                                                                            <div className="font-semibold text-xs text-gray-400 mb-1">Your Output:</div>
                                                                            <div className="pl-2 border-l-2 border-green-500">
                                                                                {executionResult.stdout || "(No output)"}
                                                                            </div>
                                                                        </div>

                                                                        {/* Error */}
                                                                        {executionResult.stderr && (
                                                                            <div>
                                                                                <div className="font-semibold text-xs text-red-400 mb-1">Error:</div>
                                                                                <div className="pl-2 border-l-2 border-red-500 text-red-400">
                                                                                    {executionResult.stderr}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Execution Info */}
                                                                        <div className="text-xs text-gray-400 mt-2">
                                                                            Status: <span className={statusColor}>{statusText}</span> |
                                                                            Time: {executionResult.executionTimeMs}ms
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="text-gray-400">
                                                                Click "Run" to execute your code against the test case.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </ResizablePanel>
                                </ResizablePanelGroup>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </>
    );
}

// Helper to format JSON input string for better display
const formatDisplayInput = (input: string): string => {
    try {
        const parsed = JSON.parse(input);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return Object.entries(parsed)
                .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
                .join('\n');
        }
    } catch (e) {
        // Not a valid JSON object string, return original
    }
    return input;
};

// Helper to parse formatted input back to a JSON string
const parseFormattedInput = (formatted: string): string => {
    try {
        // Check if it's already a valid JSON object string
        JSON.parse(formatted);
        return formatted;
    } catch (e) {
        // Not valid JSON, try to parse from k=v format
        const lines = formatted.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return '';

        const obj: { [key: string]: any } = {};
        for (const line of lines) {
            const parts = line.split('=');
            if (parts.length < 2) return formatted; // Malformed, return as is

            const key = parts[0].trim();
            const valueStr = parts.slice(1).join('=').trim();

            try {
                obj[key] = JSON.parse(valueStr);
            } catch (jsonErr) {
                return formatted; // Malformed value, return as is
            }
        }
        return JSON.stringify(obj);
    }
};

// Add a helper function to parse examples from the formatted statement
const parseExamples = (statement: string): Array<{ input: string; output: string; explanation?: string }> => {
    const examples: Array<{ input: string; output: string; explanation?: string }> = [];

    const exampleMatches = statement.match(/Example\s+\d+:[\s\S]*?Input:[\s\S]*?Output:[\s\S]*?(?=Example\s+\d+:|$)/gi);

    if (!exampleMatches) return examples;

    exampleMatches.forEach(exampleText => {
        const inputMatch = exampleText.match(/Input:\s*`([\s\S]+?)`/i);
        const outputMatch = exampleText.match(/Output:\s*`([\s\S]+?)`/i);
        const explanationMatch = exampleText.match(/Explanation:\s*([\s\S]+)/i);

        if (inputMatch && outputMatch) {
            let explanation = explanationMatch ? explanationMatch[1].trim() : undefined;

            // Clean up explanation by removing unwanted formatting characters if it exists
            if (explanation) {
                explanation = explanation
                    .replace(/```\s*\*\*/g, '') // Remove ``` **
                    .replace(/`/g, '')        // Remove `
                    .replace(/\*\*/g, '')       // Remove **
                    .trim();
            }

            examples.push({
                input: inputMatch[1].trim(),
                output: outputMatch[1].trim(),
                explanation: explanation
            });
        }
    });

    return examples;
}; 