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
import { CodeSubmitOptions } from '@/components/ui/CodeSubmitOptions';

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
    python: boolean;
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
    const [selectedSampleCount, setSelectedSampleCount] = useState(2);

    // Problem creation state
    const [isCreatingProblem, setIsCreatingProblem] = useState(false);
    const [createdProblemId, setCreatedProblemId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Editor state
    const [code, setCode] = useState<string>('// Start coding here...');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
    const [useParser, setUseParser] = useState<boolean>(true);

    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Test case state
    const [testCaseInput, setTestCaseInput] = useState<string>('');
    const [testCaseExpected, setTestCaseExpected] = useState<string>('');
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [executionResult, setExecutionResult] = useState<{ stdout: string; stderr: string; status: string; executionTimeMs: number } | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);

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
                const response = await generateTestCases(details.formatted_statement) as GenerateTestCasesResponse;
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

        setIsExecuting(true);
        setExecutionError(null);
        setExecutionResult(null);

        try {
            const response = await executeCode(
                selectedLanguage,
                currentCode,
                [testCaseInput],
            ) as ExecuteCodeResponse;

            if (response.results && response.results.length > 0) {
                setExecutionResult({
                    stdout: response.results[0].stdout,
                    stderr: response.results[0].stderr,
                    status: response.results[0].status,
                    executionTimeMs: response.results[0].execution_time_ms
                });
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

                                {/* Add CodeSubmitOptions component */}
                                <div className="mt-2">
                                    <CodeSubmitOptions useParser={useParser} setUseParser={setUseParser} />
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
                                                <div className="flex">
                                                    <div className="flex items-center mr-4">
                                                        <button
                                                            className="px-3 py-1 text-xs mr-2 rounded-full bg-indigo-600 text-white"
                                                        >
                                                            Case 1
                                                        </button>
                                                        <button
                                                            className="px-3 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-full"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Input/Output Area */}
                                            <div className="flex-grow grid grid-cols-2 gap-4 p-4 overflow-hidden min-h-[200px] bg-[#1e1e1e]">
                                                <div className="space-y-4">
                                                    {/* Input */}
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-medium text-gray-400 mb-1">Input:</p>
                                                        <textarea
                                                            className="p-2 text-sm font-mono border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-[#2d2d2d] text-gray-200 h-[40px]"
                                                            placeholder="Enter input for this test case..."
                                                            value={testCaseInput}
                                                            onChange={(e) => setTestCaseInput(e.target.value)}
                                                            rows={2}
                                                        />
                                                    </div>

                                                    {/* Expected Output */}
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-medium text-gray-400 mb-1">Expected Output:</p>
                                                        <textarea
                                                            className="p-2 text-sm font-mono border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-[#2d2d2d] text-gray-200 h-[40px]"
                                                            placeholder="Enter expected output for verification..."
                                                            value={testCaseExpected}
                                                            onChange={(e) => setTestCaseExpected(e.target.value)}
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
                                                                    Status: {executionResult.status === 'success' ? 'Accepted' : 'Failed'} |
                                                                    Time: {executionResult.executionTimeMs}ms
                                                                </div>
                                                            </div>
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

// Add a helper function to parse examples from the formatted statement
const parseExamples = (statement: string): Array<{ input: string; output: string; explanation?: string }> => {
    const examples: Array<{ input: string; output: string; explanation?: string }> = [];

    // Simple pattern matching for examples - this is basic and may need improvement
    const exampleMatches = statement.match(/Example\s+\d+[\s\S]*?Input:[\s\S]*?Output:[\s\S]*?(Explanation:[\s\S]*?)?(?=Example\s+\d+|$)/gi);

    if (!exampleMatches) return examples;

    exampleMatches.forEach(exampleText => {
        const inputMatch = exampleText.match(/Input:[\s\S]*?s\s*=\s*["'](.+?)["']/i);
        const outputMatch = exampleText.match(/Output:[\s\S]*?(\d+)/i);
        const explanationMatch = exampleText.match(/Explanation:[\s\S]*?([^]*?)(?=Example\s+\d+|$)/i);

        if (inputMatch && outputMatch) {
            let explanation = explanationMatch ? explanationMatch[1].trim() : undefined;

            // Clean up explanation by removing unwanted formatting characters
            if (explanation) {
                explanation = explanation
                    .replace(/```\s*\*\*/g, '') // Remove ``` **
                    .replace(/```/g, '')        // Remove ```
                    .replace(/\*\*/g, '')       // Remove **
                    .trim();
            }

            examples.push({
                input: `s = "${inputMatch[1]}"`,
                output: outputMatch[1],
                explanation: explanation
            });
        }
    });

    // If no examples were found through regex, create at least one placeholder
    if (examples.length === 0) {
        const inputPlaceholder = statement.includes('s = "') ? statement.match(/s\s*=\s*["'](.+?)["']/i)?.[1] : "abcabcbb";

        examples.push({
            input: `s = "${inputPlaceholder || 'example'}"`,
            output: "3",
            explanation: "The answer is \"abc\", with the length of 3."
        });
    }

    return examples;
}; 