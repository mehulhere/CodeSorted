import '@/app/globals.css';
import Editor, { Monaco } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { executeCode, submitSolution, convertPseudocode, getCodeCompletion, getAIHint } from '@/lib/api';
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, ChevronLeft, ChevronsUpDown, Loader, Terminal, XCircle, MessageSquare, ArrowUp, ArrowDown, Trash2, Lightbulb } from 'lucide-react';
import type { editor } from 'monaco-editor';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { ProblemType, ApiError, ThreadType, CommentType, ThreadsResponse, CommentsResponse, CreateThreadPayload, CreateCommentPayload, VotePayload } from '@/types/problem'; // Adjust path
import { useNotification } from '@/components/ui/notification';
import { ApiErrorResponse } from '@/lib/api';

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

interface ConvertPseudocodeResponse {
    python_code: string;
}

interface AIHintResponse {
    hints: string[];
}

export default function SingleProblemPage() {
    const router = useRouter();
    const { problemId } = router.query; // problemId comes from the filename [problemId].tsx

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
    const [output, setOutput] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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
    // useEffect(() => {
    //     const MyComponent = () => {
    //         document.body.style.overflow = 'hidden';

    //         return () => {
    //             document.body.style.overflow = ''; // Clean up to avoid side effects
    //         };
    //     };
    //     MyComponent();
    // }, []);

    useEffect(() => {
        setHasMounted(true);
    }, []);


    const [activeTab, setActiveTab] = useState('pseudocode');
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const monacoRef = useRef<Monaco | null>(null);
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
    const [monacoInstance, setMonacoInstance] = useState<any>(null);
    const lastSuggestionRef = useRef<string>('');

    const onEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
        setEditorInstance(editor);
        setMonacoInstance(monaco);
        editorRef.current = editor;

        // --- FIX for Tab Key ---
        // Programmatically disable the "Tab Trap"
        // This is equivalent to the user pressing Ctrl+M
        // It allows the Tab key to move focus out of the editor
        editor.getAction('editor.action.toggleTabFocusMode')?.run();
        // --- End of FIX ---
    };

    useEffect(() => {
        if (!monacoInstance || !editorInstance) return;

        // --- Start of Autocomplete Logic ---

        // 1. Add CSS for Ghost Text
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .monaco-editor .suggest-preview-text,
            .monaco-editor .inline-completion-text {
                opacity: 0.7 !important;
                color: #7fb5ff !important;
                font-weight: bold !important;
            }
        `;
        document.head.appendChild(styleElement);

        // 2. Configure Editor Options
        editorInstance.updateOptions({
            inlineSuggest: { enabled: true, mode: 'subword' },
            quickSuggestions: { other: true, comments: true, strings: true },
            suggestOnTriggerCharacters: true,
            tabCompletion: 'on',
            acceptSuggestionOnEnter: 'on'
        });

        // 3. Define the Completion Provider with proper debouncing and cancellation
        const inlineCompletionProvider = {
            provideInlineCompletions: async (
                model: editor.ITextModel,
                position: { lineNumber: number; column: number },
                context: any,
                token: any // This is the CancellationToken
            ) => {
                // Debounce the request
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

                    const res = await getCodeCompletion(prefix, currentLine, selectedLanguage) as CodeCompletionResponse;

                    if (token.isCancellationRequested || !res.suggestion) {
                        return { items: [] };
                    }

                    const suggestion = res.suggestion;

                    // Store the suggestion in state for Tab key handler to access
                    lastSuggestionRef.current = suggestion;

                    // The rest of the completion handling remains the same
                    // Check if this is a multi-line suggestion
                    const isMultiLine = suggestion.includes('\n');

                    let replaceRange;

                    if (isMultiLine) {
                        // For multi-line suggestions, we need to calculate the end position differently
                        // Find how many lines are in the suggestion
                        const lines = suggestion.split('\n');
                        const lastLineLength = lines[lines.length - 1].length;

                        replaceRange = new monacoInstance.Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber + lines.length - 1,
                            lines.length > 1 ? lastLineLength + 1 : position.column + lastLineLength
                        );
                    } else {
                        // For single-line suggestions, use the original approach
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
                    return { items: [] }; // Silently fail
                }
            },
            freeInlineCompletions: () => { }
        };

        const providerRegistration = monacoInstance.languages.registerInlineCompletionsProvider(
            ['python', 'javascript', 'cpp', 'java', 'pseudocode'],
            inlineCompletionProvider
        );

        // 4. Setup Key Listeners
        const keyDownListener = editorInstance.onKeyDown((e) => {
            // Check if Tab was pressed
            if (e.keyCode === monacoInstance.KeyCode.Tab.valueOf() && !e.shiftKey) {
                // Use the editor's context key to check if an inline suggestion is visible.
                // This is more reliable than querying the DOM.
                const isSuggestionVisible = (editorInstance as any).getContextKey('inlineSuggestionVisible')?.get();

                if (isSuggestionVisible) {
                    // If ghost text is visible, accept it.
                    // We prevent default and stop propagation to avoid triggering
                    // any other Tab behavior, like opening the suggestion widget.
                    e.preventDefault();
                    e.stopPropagation();
                    editorInstance.getAction('editor.action.inlineSuggest.accept')?.run();
                }
                // If no suggestion is visible, we do nothing and let the default Tab behavior occur.
                // This stops Tab from aggressively triggering the suggestion dropdown.
            } else if (e.keyCode === monacoInstance.KeyCode.Escape.valueOf()) {
                // Hide inline suggestions on Escape.
                editorInstance.getAction('editor.action.inlineSuggest.hide')?.run();
            }

            // Add a shortcut for Alt+Enter to manually insert the last suggestion
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

        // --- End of Autocomplete Logic ---

        return () => {
            // Cleanup all autocomplete resources
            providerRegistration.dispose();
            keyDownListener.dispose();
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            document.head.removeChild(styleElement);
        };
    }, [monacoInstance, editorInstance, selectedLanguage]);

    // Fetch threads for the discussion tab
    const fetchThreads = useCallback(async () => {
        if (!problemId) return;
        setIsLoadingThreads(true);
        try {
            const response = await fetch(`http://localhost:8080/api/discussions/problems/${problemId}/threads`, {
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

    // Create a new thread
    const handleCreateThread = async () => {
        if (!newThreadTitle.trim() || !newThreadContent.trim()) {
            return;
        }

        setIsCreatingThread(true);
        try {
            const response = await fetch(`http://localhost:8080/api/discussions/problems/${problemId}/threads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    problem_id: problemId,
                    title: newThreadTitle,
                    content: newThreadContent,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to create thread');
                return;
            }

            await fetchThreads();
            setNewThreadTitle('');
            setNewThreadContent('');
            setShowCreateThread(false);
        } catch (err) {
            console.error('Error creating thread:', err);
        } finally {
            setIsCreatingThread(false);
        }
    };

    // Load comments for a thread
    const loadComments = useCallback(async (threadId: string) => {
        setIsLoadingComments(true);
        try {
            const response = await fetch(`http://localhost:8080/api/discussions/threads/${threadId}/comments`, {
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

    // Create a new comment
    const handleCreateComment = async () => {
        if (!newCommentContent.trim() || !selectedThread) {
            return;
        }

        setIsCreatingComment(true);
        try {
            const response = await fetch(`http://localhost:8080/api/discussions/threads/${selectedThread.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    thread_id: selectedThread.id,
                    content: newCommentContent,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to create comment');
                return;
            }

            await loadComments(selectedThread.id);
            setNewCommentContent('');
        } catch (err) {
            console.error('Error creating comment:', err);
        } finally {
            setIsCreatingComment(false);
        }
    };

    // Handle voting
    const handleVote = async (targetId: string, type: 'thread' | 'comment', value: -1 | 0 | 1) => {
        try {
            const response = await fetch('http://localhost:8080/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    target_id: targetId,
                    type: type,
                    value: value,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to vote');
                return;
            }

            if (type === 'thread') {
                await fetchThreads();
            } else if (selectedThread) {
                await loadComments(selectedThread.id);
            }
        } catch (err) {
            console.error('Error voting:', err);
        }
    };

    // Handle deleting a comment
    const handleDeleteComment = async (commentId: string) => {
        try {
            const response = await fetch(`http://localhost:8080/api/discussions/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to delete comment');
                return;
            }

            if (selectedThread) {
                await loadComments(selectedThread.id);
            }
        } catch (err) {
            console.error('Error deleting comment:', err);
        }
    };

    // Switch to thread view
    const handleThreadClick = (thread: ThreadType) => {
        setSelectedThread(thread);
        setDiscussionView('thread');
        loadComments(thread.id);
    };

    // Back to thread list view
    const handleBackToList = () => {
        setSelectedThread(null);
        setDiscussionView('list');
        setComments([]);
        setNewCommentContent('');
    };

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
        setConvertedCode('');
    };

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/auth-status', {
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

    useEffect(() => {
        if (!problemId) {
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
                        errorMessage = response.statusText || errorMessage;
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

    function handleEditorDidMount(editor: any, monaco: Monaco) {
        onEditorMount(editor, monaco);
        monacoRef.current = monaco;
    }

    function handleEditorChange(value: string | undefined) {
        setCode(value || '');
    }

    const handleRunCode = async () => {
        if (!editorRef.current) return;

        // Get the current code from the editor
        const currentCode = editorRef.current.getValue();
        if (!currentCode.trim()) {
            setExecutionError("Code cannot be empty");
            return;
        }

        // Reset previous results
        setOutput(null);
        setExecutionError(null);
        setIsExecuting(true);
        setTestCaseResults([]);

        try {
            // Prepare test cases (use the selected one if it has content, otherwise use all with content)
            const testCasesToRun = customTestCases
                .filter(tc => tc.input.trim() !== '')
                .map(tc => tc.input);

            if (testCasesToRun.length === 0) {
                testCasesToRun.push(''); // Use empty input if no test cases defined
            }

            // Handle pseudocode conversion if needed
            let codeToRun = currentCode;
            let languageToRun = selectedLanguage;

            if (selectedLanguage === "pseudocode") {
                try {
                    const response = await convertPseudocode(currentCode) as ConvertPseudocodeResponse;
                    codeToRun = response.python_code;
                    languageToRun = "python";
                    setConvertedCode(codeToRun); // Save the converted code
                } catch (error) {
                    console.error("Error converting pseudocode:", error);
                    setExecutionError("Failed to convert pseudocode to Python. Please check your syntax.");
                    setIsExecuting(false);
                    return;
                }
            }

            // Execute the code
            const response = await executeCode(languageToRun, codeToRun, testCasesToRun) as ExecuteCodeResponse;

            // Log the response to see what we're getting
            console.log("Execute code response:", response);

            // Process results
            setOutput(response);

            // Map the results to our test case results format
            const results = response.results.map((result, index: number) => ({
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                status: result.status || 'success',
                executionTimeMs: result.execution_time_ms || 0,
                error: result.stderr, // Make sure stderr is properly assigned to error
                testCase: customTestCases[index] || { input: testCasesToRun[index] },
            }));

            setTestCaseResults(results);
            setActiveResultTab(0); // Show the first result tab
        } catch (error: unknown) {
            console.error("Error executing code:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : (error as ApiErrorResponse)?.message || "Failed to execute code. Please try again.";
            setExecutionError(errorMessage);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!editorRef.current) return;

        // Get the current code from the editor
        const currentCode = editorRef.current.getValue();
        if (!currentCode.trim()) {
            setExecutionError("Code cannot be empty");
            return;
        }

        // Clear previous results
        setSubmissionResult(null);
        setExecutionError(null);
        setIsSubmitting(true);

        try {
            // Submit the code
            const response = await submitSolution(
                problem?.problem_id || String(problemId),
                selectedLanguage,
                currentCode
            ) as SubmitSolutionResponse;

            // Get the submission ID from the response
            const submissionId = response.submission_id;

            // Redirect to the submission details page only if submissionId is valid
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

    // Add a new test case
    const handleAddTestCase = () => {
        setCustomTestCases([...customTestCases, { input: '', expected: '' }]);
        setActiveTestCase(customTestCases.length);
    };

    // Update test case input for current active test case
    const handleTestCaseInputChange = (value: string) => {
        setTestCaseInput(value);
        const updatedTestCases = [...customTestCases];
        updatedTestCases[activeTestCase] = {
            ...updatedTestCases[activeTestCase],
            input: value
        };
        setCustomTestCases(updatedTestCases);
    };

    // Update expected output for current active test case
    const handleTestCaseExpectedChange = (value: string) => {
        const updatedTestCases = [...customTestCases];
        updatedTestCases[activeTestCase] = {
            ...updatedTestCases[activeTestCase],
            expected: value
        };
        setCustomTestCases(updatedTestCases);
    };

    // AI Hints state
    const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);
    const [hints, setHints] = useState<string[] | null>(null);
    const [hintError, setHintError] = useState<string | null>(null);
    const [visibleHintIndex, setVisibleHintIndex] = useState<number>(-1);

    const handleGetHint = async () => {
        if (!editorRef.current || !problem) return;

        // Get the current code from the editor
        const currentCode = editorRef.current.getValue();

        setIsLoadingHint(true);
        setHintError(null);

        try {
            const response = await getAIHint(
                problem.statement,
                currentCode,
                selectedLanguage
            ) as AIHintResponse;

            setHints(response.hints);
            setVisibleHintIndex(0); // Show the first hint
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

    const handleShowNextHint = () => {
        if (hints && visibleHintIndex < hints.length - 1) {
            setVisibleHintIndex(visibleHintIndex + 1);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                <p className="text-xl text-gray-700">Loading problem details...</p>
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
            <div className="min-h-screen bg-gray-100">
                <ResizablePanelGroup direction="horizontal" className="min-h-screen">
                    {/* Left Panel: Problem Description */}
                    <ResizablePanel defaultSize={40} minSize={30}>
                        <div className="h-screen flex flex-col bg-white border-r border-gray-200">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h1 className="text-xl font-bold text-gray-900">{problem.title}</h1>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${problem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                            problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {problem.difficulty}
                                        </span>
                                        {problem.tags && problem.tags.map((tag, index) => (
                                            <span key={index} className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            <div className="border-b border-gray-200">
                                <div className="flex">
                                    <button
                                        className={`px-4 py-2 text-sm font-medium ${currentTab === 'description' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-700 hover:text-gray-900'}`}
                                        onClick={() => setCurrentTab('description')}
                                    >
                                        Description
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium ${currentTab === 'discussion' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-700 hover:text-gray-900'}`}
                                        onClick={() => {
                                            setCurrentTab('discussion');
                                            if (threads.length === 0) {
                                                fetchThreads();
                                            }
                                        }}
                                    >
                                        <MessageSquare className="inline-block w-4 h-4 mr-1" />
                                        Discussion
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium ${currentTab === 'submissions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-700 hover:text-gray-900'}`}
                                        onClick={() => setCurrentTab('submissions')}
                                    >
                                        Submissions
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-grow">
                                {currentTab === 'description' && (
                                    <div className="p-4">
                                        {/* Problem Statement */}
                                        <div className="mb-6">
                                            <div className="prose prose-indigo max-w-none text-gray-800"
                                                dangerouslySetInnerHTML={{ __html: problem.statement.replace(/\n/g, '<br />') }}
                                            />
                                        </div>

                                        {/* Constraints */}
                                        <div className="mb-6">
                                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Constraints</h2>
                                            <div className="prose prose-indigo max-w-none text-gray-800"
                                                dangerouslySetInnerHTML={{ __html: problem.constraints_text?.replace(/\n/g, '<br />') || 'N/A' }}
                                            />
                                            <div className="mt-3 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Time Limit</p>
                                                    <p className="text-sm text-gray-900">{problem.time_limit_ms / 1000} seconds</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Memory Limit</p>
                                                    <p className="text-sm text-gray-900">{problem.memory_limit_mb} MB</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sample Test Cases */}
                                        {problem.sample_test_cases && problem.sample_test_cases.length > 0 && (
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-800 mb-3">Examples</h2>
                                                {problem.sample_test_cases.map((tc, index) => (
                                                    <div key={index} className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Example {index + 1}</h3>
                                                        <div className="mb-2">
                                                            <p className="text-xs font-medium text-gray-600">Input:</p>
                                                            <pre className="text-xs bg-white p-2 rounded border">{tc.input}</pre>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-600">Output:</p>
                                                            <pre className="text-xs bg-white p-2 rounded border">{tc.expected_output}</pre>
                                                        </div>
                                                        {tc.notes && (
                                                            <div className="mt-2">
                                                                <p className="text-xs font-medium text-gray-600">Explanation:</p>
                                                                <p className="text-xs text-gray-700">{tc.notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* AI Hints Section */}
                                        <div className="mt-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                                                    Hints
                                                </h2>
                                                {!isLoadingHint && !hints && isLoggedIn && (
                                                    <Button
                                                        onClick={handleGetHint}
                                                        className="px-3 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-md"
                                                    >
                                                        Get Hint
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                                                {!isLoggedIn ? (
                                                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                                                        <p className="text-sm">Please <Link href="/login" className="underline font-medium">sign in</Link> to use AI hints.</p>
                                                    </div>
                                                ) : isLoadingHint ? (
                                                    <div className="flex justify-center items-center p-4">
                                                        <Loader className="w-5 h-5 mr-2 animate-spin text-yellow-500" />
                                                        <p className="text-sm text-gray-600">Generating hints...</p>
                                                    </div>
                                                ) : hintError ? (
                                                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                                                        <AlertCircle className="w-4 h-4 inline-block mr-2" />
                                                        {hintError}
                                                    </div>
                                                ) : hints && visibleHintIndex >= 0 ? (
                                                    <div className="space-y-4">
                                                        {hints.slice(0, visibleHintIndex + 1).map((hint, idx) => (
                                                            <div key={idx} className={`p-3 rounded-md ${idx === visibleHintIndex ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-100'}`}>
                                                                <div className="flex items-start">
                                                                    <div className="bg-yellow-100 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <p className="text-sm text-gray-700">{hint}</p>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {visibleHintIndex < hints.length - 1 && (
                                                            <Button
                                                                onClick={handleShowNextHint}
                                                                className="w-full mt-2 px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md flex items-center justify-center"
                                                            >
                                                                <ArrowDown className="w-4 h-4 mr-1" />
                                                                Show Next Hint
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 p-2">Click "Get Hint" if you're stuck and need some guidance. Hints are designed to help you think through the problem without giving away the solution.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentTab === 'discussion' && (
                                    <div className="p-4 h-full flex flex-col">
                                        {discussionView === 'list' ? (
                                            // Thread List View
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-lg font-semibold text-gray-800">Discussion</h2>
                                                    {isLoggedIn && (
                                                        <button
                                                            onClick={() => setShowCreateThread(!showCreateThread)}
                                                            className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                                                        >
                                                            {showCreateThread ? 'Cancel' : 'New Thread'}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Create Thread Form */}
                                                {showCreateThread && (
                                                    <div className="mb-4 p-4 border rounded-md bg-gray-50">
                                                        <h3 className="text-md font-medium text-gray-700 mb-2">Create a New Thread</h3>
                                                        <div className="mb-3">
                                                            <input
                                                                type="text"
                                                                value={newThreadTitle}
                                                                onChange={(e) => setNewThreadTitle(e.target.value)}
                                                                className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                placeholder="Thread title..."
                                                            />
                                                        </div>
                                                        <div className="mb-4">
                                                            <textarea
                                                                value={newThreadContent}
                                                                onChange={(e) => setNewThreadContent(e.target.value)}
                                                                className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                placeholder="What would you like to discuss about this problem?"
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleCreateThread}
                                                                disabled={isCreatingThread || !newThreadTitle.trim() || !newThreadContent.trim()}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                                                            >
                                                                {isCreatingThread ? 'Creating...' : 'Create Thread'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowCreateThread(false);
                                                                    setNewThreadTitle('');
                                                                    setNewThreadContent('');
                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-md"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Thread List */}
                                                <div className="flex-1 overflow-y-auto">
                                                    {isLoadingThreads ? (
                                                        <div className="text-center py-8">
                                                            <Loader className="animate-spin h-6 w-6 mx-auto text-indigo-600" />
                                                            <p className="text-gray-600 mt-2">Loading discussions...</p>
                                                        </div>
                                                    ) : threads.length === 0 ? (
                                                        <div className="text-center py-8">
                                                            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                                            <p className="text-gray-600">No discussions yet. Be the first to start a conversation!</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {threads.map((thread) => (
                                                                <div
                                                                    key={thread.id}
                                                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                                                    onClick={() => handleThreadClick(thread)}
                                                                >
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <h3 className="text-md font-medium text-gray-900 hover:text-indigo-600">
                                                                            {thread.title}
                                                                        </h3>
                                                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                                            <span className="flex items-center">
                                                                                <ArrowUp className="h-4 w-4 mr-1" />
                                                                                {thread.upvotes}
                                                                            </span>
                                                                            <span className="flex items-center">
                                                                                <MessageSquare className="h-4 w-4 mr-1" />
                                                                                {thread.comment_count}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-gray-700 text-sm mb-2 line-clamp-2">
                                                                        {thread.content}
                                                                    </p>
                                                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                                                        <p className="text-sm text-gray-500">Posted by <Link href={`/profile/${thread.username}`} className="hover:underline">{thread.username}</Link> &middot; {hasMounted ? new Date(thread.created_at).toLocaleDateString() : null}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {!isLoggedIn && (
                                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                                                        <p>Please <Link href="/login" className="underline">sign in</Link> to participate in discussions.</p>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            // Single Thread View
                                            selectedThread && (
                                                <div className="h-full flex flex-col">
                                                    {/* Thread Header */}
                                                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                                                        <button
                                                            onClick={handleBackToList}
                                                            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                            Back
                                                        </button>
                                                        <h2 className="text-lg font-semibold text-gray-800 flex-1">
                                                            {selectedThread.title}
                                                        </h2>
                                                    </div>

                                                    {/* Thread Content */}
                                                    <div className="flex-1 overflow-y-auto">
                                                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-semibold"><Link href={`/profile/${selectedThread.username}`} className="hover:underline">{selectedThread.username}</Link></p>
                                                                    <p className="text-xs text-gray-500">{hasMounted ? new Date(selectedThread.created_at).toLocaleString() : null}</p>
                                                                </div>
                                                                <div className="flex items-center space-x-3">
                                                                    {isLoggedIn && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleVote(selectedThread.id, 'thread', 1)}
                                                                                className="flex items-center text-gray-600 hover:text-green-600"
                                                                            >
                                                                                <ArrowUp className="h-4 w-4 mr-1" />
                                                                                {selectedThread.upvotes}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleVote(selectedThread.id, 'thread', -1)}
                                                                                className="flex items-center text-gray-600 hover:text-red-600"
                                                                            >
                                                                                <ArrowDown className="h-4 w-4 mr-1" />
                                                                                {selectedThread.downvotes}
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-gray-800 whitespace-pre-wrap">
                                                                {selectedThread.content}
                                                            </div>
                                                        </div>

                                                        {/* Comments Section */}
                                                        <div>
                                                            <h3 className="text-md font-medium text-gray-800 mb-4">
                                                                Comments ({comments.length})
                                                            </h3>

                                                            {isLoggedIn && !selectedThread.is_locked && (
                                                                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                                                                    <textarea
                                                                        placeholder="Add a comment..."
                                                                        value={newCommentContent}
                                                                        onChange={(e) => setNewCommentContent(e.target.value)}
                                                                        rows={3}
                                                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                                                                    />
                                                                    <button
                                                                        onClick={handleCreateComment}
                                                                        disabled={isCreatingComment || !newCommentContent.trim()}
                                                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                                                                    >
                                                                        {isCreatingComment ? 'Posting...' : 'Post Comment'}
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {isLoadingComments ? (
                                                                <div className="text-center py-4">
                                                                    <Loader className="animate-spin h-6 w-6 mx-auto text-indigo-600" />
                                                                </div>
                                                            ) : comments.length === 0 ? (
                                                                <p className="text-gray-600 text-center py-4">No comments yet.</p>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    {comments.map((comment) => (
                                                                        <div key={comment.id} className="border-l-4 border-gray-200 pl-4">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <p className="font-semibold"><Link href={`/profile/${comment.username}`} className="hover:underline">{comment.username}</Link></p>
                                                                                    <p className="text-xs text-gray-500">{hasMounted ? new Date(comment.created_at).toLocaleString() : null}</p>
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    {isLoggedIn && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={() => handleVote(comment.id, 'comment', 1)}
                                                                                                className="flex items-center text-gray-600 hover:text-green-600 text-sm"
                                                                                            >
                                                                                                <ArrowUp className="h-3 w-3 mr-1" />
                                                                                                {comment.upvotes}
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleVote(comment.id, 'comment', -1)}
                                                                                                className="flex items-center text-gray-600 hover:text-red-600 text-sm"
                                                                                            >
                                                                                                <ArrowDown className="h-3 w-3 mr-1" />
                                                                                                {comment.downvotes}
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                                                className="text-gray-600 hover:text-red-600"
                                                                                            >
                                                                                                <Trash2 className="h-3 w-3" />
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-gray-800 whitespace-pre-wrap">
                                                                                {comment.content}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}

                                {currentTab === 'submissions' && (
                                    <div className="p-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-800 mb-3">Your Submissions</h2>
                                            {isLoggedIn ? (
                                                <p className="text-gray-700 text-sm">View your submissions history for this problem.</p>
                                            ) : (
                                                <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-md">
                                                    <p>Please <Link href="/login" className="underline">sign in</Link> to view your submissions.</p>
                                                </div>
                                            )}
                                        </div>
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
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setExecutionError(null);
                                                    await handleRunCode();
                                                } catch (err) {
                                                    setExecutionError(err instanceof Error ? err.message : 'An unknown error occurred.');
                                                }
                                            }}
                                            disabled={isExecuting}
                                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                        >
                                            {isExecuting ? 'Running...' : 'Run'}
                                        </button>
                                        <button
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            onClick={handleSubmitCode}
                                            disabled={isSubmitting || !isLoggedIn}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-grow">
                                <ResizablePanelGroup direction="vertical">
                                    {/* Code Editor Panel */}
                                    <ResizablePanel defaultSize={60} minSize={30}>
                                        <div className="h-full flex flex-col">
                                            <div className="flex items-center px-4 py-2 bg-gray-50 border-b">
                                                <div className="flex">
                                                    <button
                                                        className={`px-3 py-1 text-xs rounded-tl rounded-bl ${activeTab === 'pseudocode' ? 'bg-white border border-gray-300 border-b-white' : 'bg-gray-200 text-gray-700'
                                                            }`}
                                                        onClick={() => setActiveTab('pseudocode')}
                                                    >
                                                        Editor
                                                    </button>
                                                    {selectedLanguage === 'pseudocode' && convertedCode && (
                                                        <button
                                                            className={`px-3 py-1 text-xs rounded-tr rounded-br ${activeTab === 'converted' ? 'bg-white border border-gray-300 border-b-white' : 'bg-gray-200 text-gray-700'
                                                                }`}
                                                            onClick={() => setActiveTab('converted')}
                                                        >
                                                            Converted
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
                                            ) : (
                                                <div className="flex-grow flex flex-col">
                                                    <div className="px-4 py-2 bg-gray-100 text-xs text-gray-600 border-b">
                                                        <span className="text-xs text-gray-400">Read-only</span>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <Editor
                                                            height="100%"
                                                            language="python"
                                                            value={convertedCode || "// Click 'Run' to see AI-generated code"}
                                                            theme="vs-dark"
                                                            options={{ readOnly: true }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ResizablePanel>

                                    <ResizableHandle withHandle />

                                    {/* Test Cases and Console */}
                                    <ResizablePanel defaultSize={35} minSize={20}>
                                        <div className="h-full flex flex-col bg-white">
                                            {/* Tabs */}
                                            <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4">
                                                <div className="flex">
                                                    <div className="flex items-center mr-4">
                                                        {customTestCases.map((_, index) => (
                                                            <button
                                                                key={index}
                                                                className={`px-3 py-1 text-xs mr-2 rounded-full ${activeTestCase === index
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                                    }`}
                                                                onClick={() => setActiveTestCase(index)}
                                                            >
                                                                Case {index + 1}
                                                            </button>
                                                        ))}
                                                        <button
                                                            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-full"
                                                            onClick={handleAddTestCase}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Input/Output Area */}
                                            <div className="flex-grow grid grid-cols-2 gap-4 p-4 overflow-hidden min-h-[260px]">
                                                <div className="space-y-4">
                                                    {/* Input */}
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-medium text-gray-700 mb-1">Input:</p>
                                                        <textarea
                                                            className="p-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 h-[40px]"
                                                            value={testCaseInput}
                                                            onChange={(e) => handleTestCaseInputChange(e.target.value)}
                                                            placeholder="Enter input for this test case..."
                                                            rows={2}
                                                        />
                                                    </div>

                                                    {/* Expected Output */}
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-medium text-gray-700 mb-1">Expected Output:</p>
                                                        <textarea
                                                            className="p-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 h-[40px]"
                                                            value={customTestCases[activeTestCase]?.expected || ''}
                                                            onChange={(e) => handleTestCaseExpectedChange(e.target.value)}
                                                            placeholder="Enter expected output for verification..."
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Output */}
                                                <div className="flex flex-col min-h-[20px]">
                                                    <p className="text-xs font-medium text-gray-700 mb-1">Output:</p>
                                                    <div className="h-[200px] flex-grow p-2 text-sm font-mono border border-gray-300 rounded-md bg-gray-50 overflow-auto whitespace-pre-wrap text-gray-800">
                                                        {isExecuting ? (
                                                            <div className="text-gray-600">Running code against all test cases...</div>
                                                        ) : executionError ? (
                                                            <div className="text-red-600">{executionError}</div>
                                                        ) : testCaseResults.length > 0 ? (
                                                            <>
                                                                {/* Test Result Header */}
                                                                <div className="bg-gray-800 text-white p-2 flex items-center">
                                                                    <div className="flex items-center">
                                                                        <span className={`w-2 h-2 rounded-full mr-2 ${testCaseResults.every(r => r.status === 'success')
                                                                            ? 'bg-green-500'
                                                                            : 'bg-red-500'
                                                                            }`}></span>
                                                                        <span className="font-medium">
                                                                            {testCaseResults.every(r => r.status === 'success')
                                                                                ? 'Accepted'
                                                                                : testCaseResults.some(r => r.status === 'runtime_error')
                                                                                    ? 'Runtime Error'
                                                                                    : 'Failed'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="ml-4 text-xs text-gray-300">
                                                                        Runtime: {testCaseResults[activeResultTab]?.executionTimeMs || 0} ms
                                                                    </div>
                                                                </div>

                                                                {/* Test Case Tabs */}
                                                                <div className="bg-gray-700 text-white px-2 pt-1 flex">
                                                                    {testCaseResults.map((_, index) => (
                                                                        <button
                                                                            key={index}
                                                                            className={`px-3 py-1 text-xs mr-1 rounded-t ${activeResultTab === index
                                                                                ? 'bg-gray-50 text-gray-800'
                                                                                : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                                                                                }`}
                                                                            onClick={() => setActiveResultTab(index)}
                                                                        >
                                                                            <span className={`w-2 h-2 rounded-full inline-block mr-1 ${testCaseResults[index].status === 'success'
                                                                                ? 'bg-green-500'
                                                                                : 'bg-red-500'
                                                                                }`}></span>
                                                                            Case {index + 1}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* Current Test Case Result */}
                                                                <div className="p-2 text-sm font-mono whitespace-pre-wrap flex-grow">
                                                                    {testCaseResults[activeResultTab] && (
                                                                        <div className="space-y-2">
                                                                            {/* Output */}
                                                                            {testCaseResults[activeResultTab].stdout && (
                                                                                <div>
                                                                                    <div className="font-semibold text-xs text-gray-700 mb-1">Your Output:</div>
                                                                                    <div className="pl-2 border-l-2 border-green-400">
                                                                                        {testCaseResults[activeResultTab].stdout}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Error */}
                                                                            {(testCaseResults[activeResultTab].stderr || testCaseResults[activeResultTab].error) && (
                                                                                <div>
                                                                                    <div className="font-semibold text-xs text-red-700 mb-1">Error:</div>
                                                                                    <div className="pl-2 border-l-2 border-red-400 text-red-600">
                                                                                        {testCaseResults[activeResultTab].stderr || testCaseResults[activeResultTab].error}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Expected Output if available */}
                                                                            {testCaseResults[activeResultTab].testCase?.expected && (
                                                                                <div>
                                                                                    <div className="font-semibold text-xs text-gray-700 mb-1">Expected:</div>
                                                                                    <div className="pl-2 border-l-2 border-blue-400">
                                                                                        {testCaseResults[activeResultTab].testCase.expected}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Comparison Result */}
                                                                            {testCaseResults[activeResultTab].status === 'wrong_answer' && (
                                                                                <div className="mt-1 text-xs text-red-600">
                                                                                    Your output does not match the expected output.
                                                                                </div>
                                                                            )}

                                                                            {/* Runtime Error Message */}
                                                                            {testCaseResults[activeResultTab].status === 'runtime_error' && (
                                                                                <div className="mt-1 text-xs text-red-600">
                                                                                    Runtime Error: Your code threw an exception during execution.
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : submissionResult?.error ? (
                                                            <div className="text-red-600">Submission error: {submissionResult.error}</div>
                                                        ) : (
                                                            <div className="text-gray-500">
                                                                Click "Run" to execute your code against all test cases.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Authentication Banner - shown when not logged in */}
                                        {!isLoggedIn && (
                                            <div className="mx-4 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                                                <p className="font-medium">Authentication Required</p>
                                                <p>Please <Link href="/login" className="underline">sign in</Link> to submit solutions and save your progress.</p>
                                            </div>
                                        )}
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
