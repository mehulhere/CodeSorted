/* eslint-disable react/no-unescaped-entities */
import '@/app/globals.css';
import Editor, { Monaco } from '@monaco-editor/react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { executeCode, submitSolution, getCodeCompletion, getAIHint } from '@/lib/api';
import { AlertCircle, ChevronLeft, Loader, MessageSquare, ArrowUp, ArrowDown, Trash2, Lightbulb, Play, Send, Plus, X, Timer, MemoryStick, Target, BookOpen, Users, Award, Code2, Eye, Sparkles, CheckCircle } from 'lucide-react';
import type { editor } from 'monaco-editor';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { ProblemType, ThreadType, CommentType, ThreadsResponse, CommentsResponse, ApiError } from '@/types/problem';
import { ApiErrorResponse } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';

// Type definitions for API responses
interface CodeCompletionResponse {
    suggestion: string;
}

interface ExecuteCodeResponse {
    results: Array<{
        stdout: string;
        stderr: string;
        status: string;
        execution_time_ms: number;
    }>;
    stdout: string;
    stderr: string;
    status: string;
    execution_time_ms: number;
}

interface SubmitSolutionResponse {
    submission_id: string;
}

interface AIHintResponse {
    hints: string[];
}

export default function SingleProblemPage() {
    const router = useRouter();
    const { problemId } = router.query;
    const { isDark } = useTheme();

    const [problem, setProblem] = useState<ProblemType | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState<string>('// Start coding here...');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
    const [convertedCode, setConvertedCode] = useState<string>('');
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [currentTab, setCurrentTab] = useState<string>('description');

    // New state for code execution results
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [submissionResult, setSubmissionResult] = useState<any>(null);

    // Track test case results
    const [testCaseResults, setTestCaseResults] = useState<{
        stdout: string;
        stderr: string;
        status: string;
        executionTimeMs: number;
        error?: string;
        testCase?: { input: string, expected?: string };
    }[]>([]);
    const [activeResultTab, setActiveResultTab] = useState<number>(0);

    // Test cases
    const [customTestCases, setCustomTestCases] = useState<{ input: string, expected?: string }[]>([{ input: '', expected: '' }]);
    const [activeTestCase, setActiveTestCase] = useState<number>(0);
    const [testCaseInput, setTestCaseInput] = useState<string>('');

    // Discussion state
    const [threads, setThreads] = useState<ThreadType[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(false);
    const [showCreateThread, setShowCreateThread] = useState<boolean>(false);
    const [newThreadTitle, setNewThreadTitle] = useState<string>('');
    const [newThreadContent, setNewThreadContent] = useState<string>('');
    const [isCreatingThread, setIsCreatingThread] = useState<boolean>(false);
    const [selectedThread, setSelectedThread] = useState<ThreadType | null>(null);
    const [comments, setComments] = useState<CommentType[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
    const [newCommentContent, setNewCommentContent] = useState<string>('');
    const [isCreatingComment, setIsCreatingComment] = useState<boolean>(false);
    const [discussionView, setDiscussionView] = useState<'list' | 'thread'>('list');

    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const [activeTab, setActiveTab] = useState('pseudocode');
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const monacoRef = useRef<Monaco | null>(null);
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
    const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
    const lastSuggestionRef = useRef<string>('');

    const onEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
        setEditorInstance(editor);
        setMonacoInstance(monaco);
        editorRef.current = editor;

        // Programmatically disable the "Tab Trap"
        editor.getAction('editor.action.toggleTabFocusMode')?.run();
    };

    useEffect(() => {
        if (!monacoInstance || !editorInstance) return;

        // Add CSS for Ghost Text
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .monaco-editor .suggest-preview-text,
            .monaco-editor .inline-completion-text {
                opacity: 0.7 !important;
                color: ${isDark ? '#7fb5ff' : '#0066cc'} !important;
                font-weight: bold !important;
            }
        `;
        document.head.appendChild(styleElement);

        // Configure Editor Options
        editorInstance.updateOptions({
            inlineSuggest: { enabled: true, mode: 'subword' },
            quickSuggestions: { other: true, comments: true, strings: true },
            suggestOnTriggerCharacters: true,
            tabCompletion: 'on',
            acceptSuggestionOnEnter: 'on'
        });

        // Define the Completion Provider
        const inlineCompletionProvider = {
            provideInlineCompletions: async (
                model: editor.ITextModel,
                position: { lineNumber: number; column: number },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                context: any,
                token: { isCancellationRequested: boolean }
            ) => {
                await new Promise(r => setTimeout(r, 500));
                if (token.isCancellationRequested) {
                    return { items: [] };
                }

                try {
                    const prefix = model.getValueInRange({
                        startLineNumber: 1, startColumn: 1,
                        endLineNumber: position.lineNumber, endColumn: position.column
                    });

                    const currentLine = model.getLineContent(position.lineNumber).substring(0, position.column - 1);

                    const sampleTestCase = problem?.sample_test_cases && problem.sample_test_cases.length > 0
                        ? {
                            input: problem.sample_test_cases[0].input,
                            expected_output: problem.sample_test_cases[0].expected_output
                        }
                        : undefined;

                    const res = await getCodeCompletion(
                        prefix,
                        currentLine,
                        selectedLanguage,
                        problem?.title,
                        sampleTestCase
                    ) as CodeCompletionResponse;

                    if (token.isCancellationRequested || !res.suggestion) {
                        return { items: [] };
                    }

                    const suggestion = res.suggestion;
                    lastSuggestionRef.current = suggestion;

                    const isMultiLine = suggestion.includes('\n');
                    let replaceRange;

                    if (isMultiLine) {
                        const lines = suggestion.split('\n');
                        const lastLineLength = lines[lines.length - 1].length;

                        replaceRange = new monacoInstance.Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber + lines.length - 1,
                            lines.length > 1 ? lastLineLength + 1 : position.column + lastLineLength
                        );
                    } else {
                        replaceRange = new monacoInstance.Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber,
                            model.getLineContent(position.lineNumber).length + 1
                        );
                    }

                    return { items: [{ insertText: suggestion, range: replaceRange }] };
                } catch (error) {
                    console.error("Error getting code completion:", error);
                    return { items: [] };
                }
            },
            freeInlineCompletions: () => { }
        };

        const providerRegistration = monacoInstance.languages.registerInlineCompletionsProvider(
            ['python', 'javascript', 'cpp', 'java', 'pseudocode'],
            inlineCompletionProvider
        );

        const keyDownListener = editorInstance.onKeyDown((e) => {
            if (e.keyCode === monacoInstance.KeyCode.Tab.valueOf() && !e.shiftKey) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const isSuggestionVisible = (editorInstance as any).getContextKey('inlineSuggestionVisible')?.get();

                if (isSuggestionVisible) {
                    e.preventDefault();
                    e.stopPropagation();
                    editorInstance.getAction('editor.action.inlineSuggest.accept')?.run();
                }
            } else if (e.keyCode === monacoInstance.KeyCode.Escape.valueOf()) {
                editorInstance.getAction('editor.action.inlineSuggest.hide')?.run();
            }

            if (e.altKey && e.keyCode === monacoInstance.KeyCode.Enter.valueOf()) {
                e.preventDefault();
                e.stopPropagation();

                if (lastSuggestionRef.current) {
                    const position = editorInstance.getPosition();
                    if (position) {
                        const model = editorInstance.getModel();
                        if (model) {
                            editorInstance.executeEdits('alt-enter-completion', [{
                                range: {
                                    startLineNumber: position.lineNumber,
                                    startColumn: position.column,
                                    endLineNumber: position.lineNumber,
                                    endColumn: position.column
                                },
                                text: lastSuggestionRef.current
                            }]);
                        }
                    }
                }
            }
        });

        const timeoutRef = debounceTimeoutRef;

        return () => {
            providerRegistration.dispose();
            keyDownListener.dispose();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            document.head.removeChild(styleElement);
        };
    }, [monacoInstance, editorInstance, selectedLanguage, problem, isDark]);

    // Fetch threads for discussion
    const fetchThreads = useCallback(async () => {
        if (!problemId) return;
        setIsLoadingThreads(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/discussions/problems/${problemId}/threads`, {
                credentials: 'include',
            });
            if (!response.ok) {
                setError('Failed to fetch threads');
                return;
            }
            const data: ThreadsResponse = await response.json();
            setThreads(data.threads || []);
        } catch (err) {
            console.error('Error fetching threads:', err);
        } finally {
            setIsLoadingThreads(false);
        }
    }, [problemId]);

    // Load comments for a thread
    const loadComments = useCallback(async (threadId: string) => {
        setIsLoadingComments(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/discussions/threads/${threadId}/comments`, {
                credentials: 'include',
            });
            if (!response.ok) {
                setError('Failed to fetch comments');
                return;
            }
            const data: CommentsResponse = await response.json();
            setComments(data.comments || []);
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setIsLoadingComments(false);
        }
    }, []);

    // Handle language change
    const handleLanguageChange = (value: string) => {
        if (code.trim() !== '' && code.trim() !== '// Start coding here...') {
            const confirmMessage = `You have existing code. Switching to ${value} will clear your current code. Continue?`;
            if (!confirm(confirmMessage)) {
                return;
            }
        }
        setSelectedLanguage(value);
        setCode('// Start coding here...');
        setConvertedCode('');
    };

    // Check login status
    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth-status`, {
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setIsLoggedIn(data.isLoggedIn);
                }
            } catch (err) {
                console.error('Failed to check login status:', err);
            }
        };
        checkLoginStatus();
    }, []);

    // Fetch problem data
    useEffect(() => {
        if (!problemId) return;

        const fetchProblem = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/problems/${problemId}`);
                if (!response.ok) {
                    let errorMessage = `Failed to fetch problem: ${response.status}`;
                    try {
                        const errorData: ApiError = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (_errorParse) {
                        errorMessage = response.statusText || errorMessage;
                        console.error('Error parsing JSON:', _errorParse);
                    }
                    setError(errorMessage);
                    return;
                }
                const data: ProblemType = await response.json();
                setProblem(data);

                // Initialize with sample test cases if available
                if (data.sample_test_cases && data.sample_test_cases.length > 0) {
                    const initialTestCases = data.sample_test_cases.map(tc => ({
                        input: tc.input,
                        expected: tc.expected_output
                    }));
                    setCustomTestCases(initialTestCases);
                    setTestCaseInput(initialTestCases[0].input);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                console.error(`Fetch problem ${problemId} error:`, err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProblem();
    }, [problemId]);

    // Update test case input when active test case changes
    useEffect(() => {
        if (customTestCases[activeTestCase]) {
            setTestCaseInput(customTestCases[activeTestCase].input);
        }
    }, [activeTestCase, customTestCases]);

    // Handle run code
    const handleRunCode = async () => {
        if (!editorRef.current) return;

        const currentCode = editorRef.current.getValue();
        if (!currentCode.trim()) {
            setExecutionError("Code cannot be empty");
            return;
        }

        setTestCaseResults([]);
        setExecutionError(null);
        setIsExecuting(true);

        try {
            let testCaseInputs = customTestCases.map(tc => tc.input).filter(input => input.trim() !== '');
            if (testCaseInputs.length === 0) {
                testCaseInputs = [''];
            }

            const response = await executeCode(
                selectedLanguage,
                currentCode,
                testCaseInputs,
                problem?.problem_id || String(problemId)
            ) as ExecuteCodeResponse;

            const results = response.results.map((result, index) => ({
                stdout: result.stdout,
                stderr: result.stderr,
                status: result.status,
                executionTimeMs: result.execution_time_ms,
                testCase: customTestCases[index]
            }));

            setTestCaseResults(results);
            setActiveResultTab(0);
        } catch (error) {
            console.error("Error executing code:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : (error as ApiErrorResponse)?.message || "Failed to execute code. Please try again.";
            setExecutionError(errorMessage);
        } finally {
            setIsExecuting(false);
        }
    };

    // Handle submit code
    const handleSubmitCode = async () => {
        if (!editorRef.current) return;

        const currentCode = editorRef.current.getValue();
        if (!currentCode.trim()) {
            setExecutionError("Code cannot be empty");
            return;
        }

        setSubmissionResult(null);
        setExecutionError(null);
        setIsSubmitting(true);

        try {
            // @ts-ignore - API accepts additional parameters
            const response = await submitSolution(
                problem?.problem_id || String(problemId),
                selectedLanguage,
                currentCode
            ) as SubmitSolutionResponse;

            const submissionId = response.submission_id;

            if (submissionId) {
                router.push(`/submissions/${submissionId}`);
            } else {
                setExecutionError("Submission ID was not returned. Please try again.");
            }
        } catch (error: unknown) {
            console.error("Error submitting code:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : (error as ApiErrorResponse)?.message || "Failed to submit solution. Please try again.";
            setExecutionError(errorMessage);
            setIsSubmitting(false);
        }
    };

    // AI Hints state
    const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);
    const [hints, setHints] = useState<string[] | null>(null);
    const [hintError, setHintError] = useState<string | null>(null);
    const [visibleHintIndex, setVisibleHintIndex] = useState<number>(-1);

    const handleGetHint = async () => {
        if (!editorRef.current || !problem) return;

        const currentCode = editorRef.current.getValue();
        setIsLoadingHint(true);
        setHintError(null);

        try {
            const response = await getAIHint(
                problem.statement,
                currentCode,
                selectedLanguage
            ) as AIHintResponse;

            const maxHints = problem.difficulty === 'Easy' ? 1 :
                problem.difficulty === 'Medium' ? 2 : 3;

            const limitedHints = response.hints.slice(0, maxHints);
            setHints(limitedHints);
            setVisibleHintIndex(0);
        } catch (error) {
            console.error("Error getting hints:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : (error as ApiErrorResponse)?.message || "Failed to get hints. Please try again.";
            setHintError(errorMessage);
        } finally {
            setIsLoadingHint(false);
        }
    };

    const getDifficultyConfig = (difficulty: string) => {
        const configs = {
            Easy: {
                color: isDark ? 'text-green-400 bg-green-900/30 border-green-500/30' : 'text-green-700 bg-green-100 border-green-200',
                icon: CheckCircle,
                gradient: 'from-green-500 to-emerald-500'
            },
            Medium: {
                color: isDark ? 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' : 'text-yellow-700 bg-yellow-100 border-yellow-200',
                icon: Timer,
                gradient: 'from-yellow-500 to-orange-500'
            },
            Hard: {
                color: isDark ? 'text-red-400 bg-red-900/30 border-red-500/30' : 'text-red-700 bg-red-100 border-red-200',
                icon: Target,
                gradient: 'from-red-500 to-pink-500'
            }
        };
        return configs[difficulty as keyof typeof configs] || configs.Easy;
    };

    if (isLoading) {
        return (
            <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="text-center">
                    <div className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent`}></div>
                    <p className={`mt-4 text-xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading problem details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <GlassCard className="text-center max-w-md" padding="lg">
                    <AlertCircle className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                    <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Error</h2>
                    <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
                    <AnimatedButton
                        href="/problems"
                        variant="primary"
                        gradient={true}
                    >
                        Back to Problems
                    </AnimatedButton>
                </GlassCard>
            </div>
        );
    }

    if (!problem) {
        return (
            <div className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <GlassCard className="text-center max-w-md" padding="lg">
                    <Code2 className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Problem Not Found</h2>
                    <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>The problem you're looking for doesn't exist.</p>
                    <AnimatedButton
                        href="/problems"
                        variant="primary"
                        gradient={true}
                    >
                        Back to Problems
                    </AnimatedButton>
                </GlassCard>
            </div>
        );
    }

    const diffConfig = getDifficultyConfig(problem.difficulty);

    return (
        <>
            <Head>
                <title>{problem.title} - CodeSorted</title>
                <meta name="description" content={`Solve ${problem.title} - ${problem.difficulty} difficulty coding challenge`} />
            </Head>

            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <ResizablePanelGroup direction="horizontal" className="min-h-screen">
                    {/* Left Panel: Problem Description */}
                    <ResizablePanel defaultSize={40} minSize={30}>
                        <div className={`h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                            } border-r`}>
                            {/* Enhanced Header */}
                            <div className={`p-6 border-b transition-colors duration-300 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'
                                } backdrop-blur-sm`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {problem.title}
                                        </h1>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${diffConfig.color}`}>
                                                {problem.difficulty}
                                            </span>
                                            {problem.tags && problem.tags.map((tag, index) => (
                                                <span key={index} className={`px-2 py-1 text-xs font-medium rounded-md ${isDark
                                                    ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                    }`}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-full bg-gradient-to-r ${diffConfig.gradient}`}>
                                            <diffConfig.icon className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Problem Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { icon: Timer, label: 'Time Limit', value: `${problem.time_limit_ms / 1000}s` },
                                        { icon: MemoryStick, label: 'Memory Limit', value: `${problem.memory_limit_mb}MB` },
                                        { icon: Eye, label: 'Difficulty', value: problem.difficulty }
                                    ].map((stat, index) => (
                                        <div key={index} className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-white/50'
                                            } backdrop-blur-sm border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                            <stat.icon className={`w-4 h-4 mx-auto mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                            <div className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {stat.label}
                                            </div>
                                            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {stat.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Enhanced Tab Navigation */}
                            <div className={`border-b transition-colors duration-300 ${isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50/30'
                                } backdrop-blur-sm`}>
                                <div className="flex">
                                    {[
                                        { id: 'description', label: 'Description', icon: BookOpen },
                                        { id: 'discussion', label: 'Discussion', icon: MessageSquare },
                                        { id: 'submissions', label: 'Submissions', icon: Award }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-all duration-300 ${currentTab === tab.id
                                                ? isDark
                                                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/20'
                                                    : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                                : isDark
                                                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                                }`}
                                            onClick={() => {
                                                setCurrentTab(tab.id);
                                                if (tab.id === 'discussion' && threads.length === 0) {
                                                    fetchThreads();
                                                }
                                            }}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-grow">
                                {currentTab === 'description' && (
                                    <div className="p-6 space-y-6">
                                        {/* Problem Statement */}
                                        <div>
                                            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Problem Statement
                                            </h2>
                                            <div className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
                                                <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                                    {problem.statement.split('Example 1:')[0]}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Examples Section */}
                                        <div>
                                            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Examples
                                            </h2>
                                            <div className="space-y-4">
                                                {parseExamples(problem.statement).map((example, idx) => (
                                                    <GlassCard key={idx} className="overflow-hidden" padding="none">
                                                        <div className={`px-4 py-3 border-b ${isDark
                                                            ? 'bg-gray-700/50 border-gray-600 text-gray-300'
                                                            : 'bg-gray-50/50 border-gray-200 text-gray-700'
                                                            }`}>
                                                            <h3 className="text-sm font-medium">Example {idx + 1}</h3>
                                                        </div>
                                                        <div className="p-4 space-y-3">
                                                            <div>
                                                                <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    Input:
                                                                </div>
                                                                <div className={`p-3 rounded-lg font-mono text-sm ${isDark ? 'bg-gray-900 text-green-400' : 'bg-gray-900 text-white'
                                                                    }`}>
                                                                    {example.input}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    Output:
                                                                </div>
                                                                <div className={`p-3 rounded-lg font-mono text-sm ${isDark ? 'bg-gray-900 text-blue-400' : 'bg-gray-900 text-white'
                                                                    }`}>
                                                                    {example.output}
                                                                </div>
                                                            </div>
                                                            {example.explanation && (
                                                                <div>
                                                                    <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                        Explanation:
                                                                    </div>
                                                                    <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                        {example.explanation}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </GlassCard>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Constraints */}
                                        <div>
                                            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Constraints
                                            </h2>
                                            <GlassCard padding="lg">
                                                <ul className={`list-disc list-inside space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {(problem.constraints_text || '').split('\n').filter(c => c.trim()).map((constraint, idx) => (
                                                        <li key={idx} className="text-sm font-mono">{constraint}</li>
                                                    ))}
                                                </ul>
                                            </GlassCard>
                                        </div>

                                        {/* Enhanced AI Hints Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                                                    AI Hints
                                                    <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {problem.difficulty === 'Easy' ? '1 hint' :
                                                            problem.difficulty === 'Medium' ? '2 hints' : '3 hints'} available
                                                    </span>
                                                </h2>
                                                {!isLoadingHint && !hints && isLoggedIn && (
                                                    <AnimatedButton
                                                        onClick={handleGetHint}
                                                        variant="warning"
                                                        size="sm"
                                                        icon={Sparkles}
                                                        glow={true}
                                                    >
                                                        Get Hint
                                                    </AnimatedButton>
                                                )}
                                            </div>

                                            <GlassCard padding="lg">
                                                {!isLoggedIn ? (
                                                    <div className={`p-4 rounded-lg border ${isDark
                                                        ? 'bg-blue-900/20 border-blue-500/30 text-blue-400'
                                                        : 'bg-blue-50 border-blue-200 text-blue-700'
                                                        }`}>
                                                        <p className="text-sm">
                                                            Please <Link href="/login" className="underline font-medium">sign in</Link> to use AI hints.
                                                        </p>
                                                    </div>
                                                ) : isLoadingHint ? (
                                                    <div className="flex justify-center items-center p-6">
                                                        <Loader className="w-6 h-6 mr-3 animate-spin text-yellow-500" />
                                                        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            Generating personalized hints...
                                                        </p>
                                                    </div>
                                                ) : hintError ? (
                                                    <div className={`p-4 rounded-lg border ${isDark
                                                        ? 'bg-red-900/20 border-red-500/30 text-red-400'
                                                        : 'bg-red-50 border-red-200 text-red-700'
                                                        }`}>
                                                        <AlertCircle className="w-4 h-4 inline-block mr-2" />
                                                        {hintError}
                                                    </div>
                                                ) : hints && visibleHintIndex >= 0 ? (
                                                    <div className="space-y-4">
                                                        {hints.slice(0, visibleHintIndex + 1).map((hint, idx) => (
                                                            <div key={idx} className={`p-4 rounded-lg border transition-all duration-300 ${idx === visibleHintIndex
                                                                ? isDark
                                                                    ? 'bg-yellow-900/20 border-yellow-500/30'
                                                                    : 'bg-yellow-50 border-yellow-200'
                                                                : isDark
                                                                    ? 'bg-gray-700/30 border-gray-600/30'
                                                                    : 'bg-gray-50 border-gray-200'
                                                                }`}>
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-yellow-600 text-yellow-100' : 'bg-yellow-500 text-yellow-50'
                                                                        }`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                        {hint}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {visibleHintIndex < hints.length - 1 && (
                                                            <AnimatedButton
                                                                onClick={() => setVisibleHintIndex(visibleHintIndex + 1)}
                                                                variant="warning"
                                                                className="w-full"
                                                                icon={ArrowDown}
                                                            >
                                                                Show Next Hint ({visibleHintIndex + 2}/{hints.length})
                                                            </AnimatedButton>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className={`text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                        <p className="text-sm mb-2">
                                                            Need help? Get AI-powered hints tailored to your progress!
                                                        </p>
                                                        <p className="text-xs opacity-75">
                                                            Hints are designed to guide your thinking without spoiling the solution.
                                                        </p>
                                                    </div>
                                                )}
                                            </GlassCard>
                                        </div>
                                    </div>
                                )}

                                {/* Discussion and Submissions tabs with placeholder content */}
                                {currentTab === 'discussion' && (
                                    <div className="p-6">
                                        <GlassCard className="text-center" padding="lg">
                                            <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Discussion Coming Soon
                                            </h3>
                                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Discussion features are being enhanced with the new design system.
                                            </p>
                                        </GlassCard>
                                    </div>
                                )}

                                {currentTab === 'submissions' && (
                                    <div className="p-6">
                                        <GlassCard className="text-center" padding="lg">
                                            <Award className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Your Submissions
                                            </h3>
                                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {isLoggedIn ?
                                                    'Submission history will be displayed here.' :
                                                    <>Please <Link href="/login" className="underline font-medium">sign in</Link> to view your submissions.</>
                                                }
                                            </p>
                                        </GlassCard>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel: Enhanced Code Editor */}
                    <ResizablePanel defaultSize={60} minSize={40}>
                        <div className={`h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-800' : 'bg-white'
                            }`}>
                            {/* Enhanced Language Selector */}
                            <div className={`p-4 border-b transition-colors duration-300 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'
                                } backdrop-blur-sm`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) => handleLanguageChange(e.target.value)}
                                            className={`px-4 py-2 rounded-lg border transition-all duration-300 ${isDark
                                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                                } focus:ring-2 focus:ring-blue-500/20`}
                                        >
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="cpp">C++</option>
                                            <option value="java">Java</option>
                                            <option value="pseudocode">Pseudocode</option>
                                        </select>

                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Press <kbd className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                                }`}>Tab</kbd> for AI suggestions
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <AnimatedButton
                                            onClick={handleRunCode}
                                            variant="success"
                                            icon={Play}
                                            loading={isExecuting}
                                            glow={true}
                                        >
                                            {isExecuting ? 'Running...' : 'Run'}
                                        </AnimatedButton>

                                        <AnimatedButton
                                            onClick={handleSubmitCode}
                                            variant="primary"
                                            icon={Send}
                                            loading={isSubmitting}
                                            disabled={!isLoggedIn}
                                            gradient={true}
                                            glow={true}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit'}
                                        </AnimatedButton>
                                    </div>
                                </div>
                            </div>

                            {/* Editor Area with enhanced styling */}
                            <div className="flex-grow">
                                <ResizablePanelGroup direction="vertical">
                                    <ResizablePanel defaultSize={60} minSize={30}>
                                        <div className="h-full flex flex-col">
                                            <div className={`flex items-center px-4 py-2 border-b transition-colors duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                                                }`}>
                                                <div className="flex">
                                                    <button
                                                        className={`px-4 py-2 text-sm rounded-tl rounded-bl transition-all duration-300 ${activeTab === 'pseudocode'
                                                            ? isDark
                                                                ? 'bg-gray-700 text-white border border-gray-600'
                                                                : 'bg-white text-gray-900 border border-gray-300'
                                                            : isDark
                                                                ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                                                : 'bg-gray-200 text-gray-700 hover:text-gray-900'
                                                            }`}
                                                        onClick={() => setActiveTab('pseudocode')}
                                                    >
                                                        <Code2 className="w-4 h-4 inline-block mr-2" />
                                                        Editor
                                                    </button>
                                                    {selectedLanguage === 'pseudocode' && convertedCode && (
                                                        <button
                                                            className={`px-4 py-2 text-sm rounded-tr rounded-br transition-all duration-300 ${activeTab === 'converted'
                                                                ? isDark
                                                                    ? 'bg-gray-700 text-white border border-gray-600'
                                                                    : 'bg-white text-gray-900 border border-gray-300'
                                                                : isDark
                                                                    ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                                                    : 'bg-gray-200 text-gray-700 hover:text-gray-900'
                                                                }`}
                                                            onClick={() => setActiveTab('converted')}
                                                        >
                                                            <Sparkles className="w-4 h-4 inline-block mr-2" />
                                                            AI Generated
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {activeTab === 'pseudocode' ? (
                                                <div className="flex-grow">
                                                    <Editor
                                                        height="100%"
                                                        language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                                                        value={code}
                                                        onChange={(value) => setCode(value || '')}
                                                        onMount={onEditorMount}
                                                        theme={isDark ? 'vs-dark' : 'light'}
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
                                                            padding: { top: 16, bottom: 16 },
                                                            suggestOnTriggerCharacters: true,
                                                            quickSuggestions: true,
                                                            tabCompletion: 'on',
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex-grow flex flex-col">
                                                    <div className={`px-4 py-2 border-b text-xs transition-colors duration-300 ${isDark
                                                        ? 'bg-gray-800 border-gray-700 text-gray-400'
                                                        : 'bg-gray-100 border-gray-200 text-gray-600'
                                                        }`}>
                                                        AI-Generated Code (Read-only)
                                                    </div>
                                                    <div className="flex-grow">
                                                        <Editor
                                                            height="100%"
                                                            language="python"
                                                            value={convertedCode || "// Click 'Run' to see AI-generated code"}
                                                            theme={isDark ? 'vs-dark' : 'light'}
                                                            options={{
                                                                readOnly: true,
                                                                minimap: { enabled: false },
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ResizablePanel>

                                    <ResizableHandle withHandle />

                                    {/* Enhanced Test Cases Panel */}
                                    <ResizablePanel defaultSize={35} minSize={20}>
                                        <div className={`h-full flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-800'
                                            }`}>
                                            {/* Enhanced Test Case Tabs */}
                                            <div className={`h-12 border-b flex items-center px-4 transition-colors duration-300 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'
                                                }`}>
                                                <div className="flex items-center gap-2 overflow-x-auto">
                                                    {customTestCases.map((_, index) => (
                                                        <button
                                                            key={index}
                                                            className={`px-3 py-1 text-xs rounded-full flex-shrink-0 transition-all duration-300 ${activeTestCase === index
                                                                ? 'bg-blue-600 text-white shadow-lg'
                                                                : isDark
                                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                                }`}
                                                            onClick={() => setActiveTestCase(index)}
                                                        >
                                                            Case {index + 1}
                                                        </button>
                                                    ))}
                                                    <AnimatedButton
                                                        onClick={() => setCustomTestCases([...customTestCases, { input: '', expected: '' }])}
                                                        size="sm"
                                                        variant="ghost"
                                                        icon={Plus}
                                                        className="px-2 py-1"
                                                    >
                                                        Add
                                                    </AnimatedButton>
                                                </div>
                                            </div>

                                            {/* Enhanced Input/Output Area */}
                                            <div className="flex-grow grid grid-cols-2 gap-4 p-4 overflow-hidden min-h-[260px]">
                                                <div className="space-y-4">
                                                    {/* Input */}
                                                    <div className="flex flex-col">
                                                        <label className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Input:
                                                        </label>
                                                        <textarea
                                                            className={`p-3 text-sm font-mono rounded-lg border transition-all duration-300 resize-y ${isDark
                                                                ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500'
                                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                                                                } focus:ring-2 focus:ring-blue-500/20`}
                                                            value={testCaseInput}
                                                            onChange={(e) => {
                                                                setTestCaseInput(e.target.value);
                                                                const updatedTestCases = [...customTestCases];
                                                                updatedTestCases[activeTestCase] = {
                                                                    ...updatedTestCases[activeTestCase],
                                                                    input: e.target.value
                                                                };
                                                                setCustomTestCases(updatedTestCases);
                                                            }}
                                                            placeholder="Enter input for this test case..."
                                                            rows={Math.max(3, (testCaseInput || '').split('\n').length)}
                                                        />
                                                    </div>

                                                    {/* Expected Output */}
                                                    <div className="flex flex-col">
                                                        <label className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Expected Output:
                                                        </label>
                                                        <textarea
                                                            className={`p-3 text-sm font-mono rounded-lg border transition-all duration-300 ${isDark
                                                                ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500'
                                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                                                                } focus:ring-2 focus:ring-blue-500/20`}
                                                            value={customTestCases[activeTestCase]?.expected || ''}
                                                            onChange={(e) => {
                                                                const updatedTestCases = [...customTestCases];
                                                                updatedTestCases[activeTestCase] = {
                                                                    ...updatedTestCases[activeTestCase],
                                                                    expected: e.target.value
                                                                };
                                                                setCustomTestCases(updatedTestCases);
                                                            }}
                                                            placeholder="Enter expected output..."
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Enhanced Output Display */}
                                                <div className="flex flex-col">
                                                    <label className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        Output:
                                                    </label>
                                                    <div className={`flex-grow p-4 text-sm font-mono rounded-lg border overflow-auto transition-all duration-300 ${isDark
                                                        ? 'bg-gray-800 border-gray-600 text-gray-200'
                                                        : 'bg-white border-gray-300 text-gray-900'
                                                        }`}>
                                                        {isExecuting ? (
                                                            <div className="flex items-center justify-center h-full">
                                                                <Loader className="w-6 h-6 animate-spin text-blue-500 mr-3" />
                                                                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                                    Executing code...
                                                                </span>
                                                            </div>
                                                        ) : executionError ? (
                                                            <div className="text-red-400 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <AlertCircle className="w-4 h-4" />
                                                                    <span className="font-semibold">Execution Error</span>
                                                                </div>
                                                                <div className="pl-6 text-sm">{executionError}</div>
                                                            </div>
                                                        ) : testCaseResults.length > 0 && testCaseResults[activeResultTab] ? (
                                                            (() => {
                                                                const result = testCaseResults[activeResultTab];
                                                                const testCase = result.testCase;

                                                                let statusText = 'Failed';
                                                                let statusColor = 'text-red-400';

                                                                if (result.status === 'success') {
                                                                    const isCorrect = testCase && result.stdout.trim() === (testCase.expected || '').trim();
                                                                    if (isCorrect) {
                                                                        statusText = 'Accepted';
                                                                        statusColor = 'text-green-400';
                                                                    } else {
                                                                        statusText = 'Wrong Answer';
                                                                        statusColor = 'text-yellow-400';
                                                                    }
                                                                }

                                                                return (
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <div className="font-semibold text-xs mb-2 text-blue-400">Your Output:</div>
                                                                            <div className={`pl-3 border-l-2 border-blue-500 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                                {result.stdout || "(No output)"}
                                                                            </div>
                                                                        </div>

                                                                        {result.stderr && (
                                                                            <div>
                                                                                <div className="font-semibold text-xs mb-2 text-red-400">Error:</div>
                                                                                <div className="pl-3 border-l-2 border-red-500 text-red-400 text-xs">
                                                                                    {result.stderr}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {testCase?.expected && (
                                                                            <div>
                                                                                <div className="font-semibold text-xs mb-2 text-green-400">Expected Output:</div>
                                                                                <div className={`pl-3 border-l-2 border-green-500 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                                    {testCase.expected}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <div className={`flex items-center justify-between text-xs pt-3 border-t ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'
                                                                            }`}>
                                                                            <span className={`font-semibold ${statusColor}`}>
                                                                                {statusText}
                                                                            </span>
                                                                            <span>
                                                                                {result.executionTimeMs}ms
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                                <p className="text-sm">
                                                                    Click "Run" to execute your code
                                                                </p>
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

// Keep existing parseExamples function
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

            if (explanation) {
                explanation = explanation
                    .replace(/```\s*\*\*/g, '')
                    .replace(/`/g, '')
                    .replace(/\*\*/g, '')
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
