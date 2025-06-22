import '@/app/globals.css';
import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader, MessageSquare, Lightbulb, ArrowDown, Plus, X, Timer, MemoryStick, Target, BookOpen, Users, Award, Code2, Eye, Sparkles, CheckCircle, Play, Send, ChevronLeft, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import {
    createProblem,
    generateTestCases,
    bulkAddTestCases,
    getAuthStatus,
    generateProblemDetails,
    ProblemDetails,
    executeCode,
    submitSolution,
    getAIHint,
    getCodeCompletion,
    convertPseudocode,
    getSubmissionDetails
} from '@/lib/api';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import Link from 'next/link';
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

// Animated Sprinkler Component
const AnimatedSprinkler = ({ trigger = false, duration = 3000 }: { trigger?: boolean; duration?: number }) => {
    const [isActive, setIsActive] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        if (trigger) {
            setIsActive(true);
            const timer = setTimeout(() => setIsActive(false), duration);
            return () => clearTimeout(timer);
        }
    }, [trigger, duration]);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {/* Sparkle particles */}
            {Array.from({ length: 50 }).map((_, i) => (
                <div
                    key={i}
                    className={`absolute animate-bounce opacity-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${1 + Math.random() * 2}s`,
                        animationFillMode: 'forwards',
                    }}
                >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
            ))}

            {/* Confetti-like elements */}
            {Array.from({ length: 30 }).map((_, i) => (
                <div
                    key={`confetti-${i}`}
                    className="absolute w-2 h-2 rounded-full animate-ping opacity-0"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        backgroundColor: `hsl(${Math.random() * 360}, 70%, ${isDark ? '60%' : '50%'})`,
                        animationDelay: `${Math.random() * 1.5}s`,
                        animationDuration: `${0.5 + Math.random() * 1}s`,
                        animationFillMode: 'forwards',
                    }}
                />
            ))}

            {/* Gradient overlay for magical effect */}
            <div
                className={`absolute inset-0 opacity-30 animate-pulse bg-gradient-to-br ${isDark
                    ? 'from-blue-900/20 via-purple-900/20 to-pink-900/20'
                    : 'from-blue-300/20 via-purple-300/20 to-pink-300/20'
                    }`}
                style={{
                    animationDuration: '2s',
                    animationIterationCount: '2'
                }}
            />
        </div>
    );
};

// Static Sprinkler Component
const StaticSprinkler = ({ className = '' }: { className?: string }) => {
    const { isDark } = useTheme();

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Background gradient */}
            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${isDark
                ? 'from-blue-600 via-purple-600 to-pink-600'
                : 'from-blue-400 via-purple-400 to-pink-400'
                }`} />

            {/* Static sparkles pattern */}
            <div className="absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className={`absolute ${isDark ? 'text-blue-400/30' : 'text-blue-500/40'}`}
                        style={{
                            left: `${10 + (i * 4.5)}%`,
                            top: `${15 + ((i % 4) * 20)}%`,
                            transform: `rotate(${i * 18}deg)`
                        }}
                    >
                        <Sparkles className="w-3 h-3" />
                    </div>
                ))}
            </div>

            {/* Floating elements */}
            <div className="absolute inset-0">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={`float-${i}`}
                        className="absolute w-1 h-1 rounded-full opacity-40 animate-pulse"
                        style={{
                            left: `${5 + (i * 8)}%`,
                            top: `${20 + ((i % 3) * 25)}%`,
                            backgroundColor: `hsl(${200 + (i * 30)}, 70%, ${isDark ? '60%' : '50%'})`,
                            animationDelay: `${i * 0.3}s`,
                            animationDuration: '3s'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

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

interface CodeCompletionResponse {
    suggestion: string;
}

interface AIHintResponse {
    hints: string[];
}

interface ConvertPseudocodeResponse {
    python_code: string;
}

interface TestCase {
    input: string;
    output: string;
}

interface SubmitSolutionResponse {
    submission_id: string;
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

// Copied from [problemId].tsx
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

    const submissionsWithWorseComplexity = totalSubmissions - submissionsWithBetterOrEqualComplexity;
    const percentile = (submissionsWithWorseComplexity / totalSubmissions) * 100;

    return percentile;
};

const getStatusClass = (status: string, isDark: boolean) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
        case 'ACCEPTED': return `${baseClasses} ${isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`;
        case 'WRONG_ANSWER': return `${baseClasses} ${isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'}`;
        case 'TIME_LIMIT_EXCEEDED': return `${baseClasses} ${isDark ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`;
        case 'MEMORY_LIMIT_EXCEEDED': return `${baseClasses} ${isDark ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`;
        case 'RUNTIME_ERROR': return `${baseClasses} ${isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700'}`;
        case 'COMPILATION_ERROR': return `${baseClasses} ${isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-700'}`;
        case 'PENDING':
        case 'PROCESSING':
        case 'IN_PROGRESS':
            return `${baseClasses} ${isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700'}`;
        default: return `${baseClasses} ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'}`;
    }
};

const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index}>{part.slice(1, -1)}</code>;
        }
        return part;
    });
};

export default function CreateProblemPage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Problem creation state
    const [rawProblemStatement, setRawProblemStatement] = useState('');
    const [problemDetails, setProblemDetails] = useState<ProblemDetails | null>(null);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [problemView, setProblemView] = useState<'input' | 'preview'>('input');
    const [currentTab, setCurrentTab] = useState('description');

    // Welcome card state
    const [welcomeCardCollapsed, setWelcomeCardCollapsed] = useState(false);

    // AI Modal state
    const [isAIModalOpen, setIsAIModalOpen] = useState(true);

    // Test case generation state
    const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
    const [generatedTestCases, setGeneratedTestCases] = useState<Record<string, TestCase> | null>(null);
    const [testCaseError, setTestCaseError] = useState<string | null>(null);
    const [selectedSampleCount, setSelectedSampleCount] = useState(5);

    // Problem creation state
    const [isCreatingProblem, setIsCreatingProblem] = useState(false);
    const [createdProblemId, setCreatedProblemId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Submission State
    const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetail | null>(null);
    const [problemStats, setProblemStats] = useState<ProblemStats | null>(null);

    // Editor state
    const [code, setCode] = useState<string>('// Start coding here...');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [convertedCode, setConvertedCode] = useState<string>('');
    const [activeEditorTab, setActiveEditorTab] = useState('editor');

    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // AI Hints state
    const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);
    const [hints, setHints] = useState<string[] | null>(null);
    const [hintError, setHintError] = useState<string | null>(null);
    const [visibleHintIndex, setVisibleHintIndex] = useState<number>(-1);

    // Autocomplete state
    const monacoRef = useRef<Monaco | null>(null);
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
    const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
    const lastSuggestionRef = useRef<string>('');

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

    // Fetch submissions for the problem
    const fetchSubmissions = useCallback(async () => {
        if (!problemDetails?.problem_id) return;
        setIsLoadingSubmissions(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/submissions?problem_id=${problemDetails.problem_id}`, {
                credentials: 'include',
            });
            if (!response.ok) {
                setError('Failed to fetch submissions');
                return;
            }
            const data = await response.json();
            setSubmissions(data.submissions || []);
        } catch (err) {
            console.error('Error fetching submissions:', err);
        } finally {
            setIsLoadingSubmissions(false);
        }
    }, [problemDetails?.problem_id]);

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

    // Effect to poll submission status when a submission is selected
    useEffect(() => {
        if (!selectedSubmission?.id) return;

        const isFinalStatus = ["ACCEPTED", "WRONG_ANSWER", "RUNTIME_ERROR", "COMPILATION_ERROR", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED"].includes(selectedSubmission.status);

        if (isFinalStatus) {
            fetchSubmissions();
            return;
        }

        const poll = async () => {
            try {
                const details = await getSubmissionDetails(selectedSubmission.id) as SubmissionDetail;
                setSelectedSubmission(details);

                if (details.status === "ACCEPTED" && details.problem_id) {
                    const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/problems/${details.problem_id}/stats`);
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        setProblemStats(statsData);
                    }
                }
            } catch (error) {
                console.error("Failed to poll submission details:", error);
            }
        };

        const intervalId = setInterval(poll, 2000);

        return () => clearInterval(intervalId);
    }, [selectedSubmission, fetchSubmissions]);

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

    // Effect for autocomplete
    useEffect(() => {
        if (!monacoInstance || !editorInstance) return;

        // Add CSS for Ghost Text with dynamic theme
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                context: any, // Using any for Monaco editor types compatibility
                token: { isCancellationRequested: boolean }
            ) => {
                // Debounce the request
                await new Promise(r => setTimeout(r, 500));
                if (token.isCancellationRequested || !problemDetails) {
                    return { items: [] };
                }

                try {
                    const prefix = model.getValueInRange({
                        startLineNumber: 1, startColumn: 1,
                        endLineNumber: position.lineNumber, endColumn: position.column
                    });

                    const currentLine = model.getLineContent(position.lineNumber).substring(0, position.column - 1);

                    // Get sample test case for providing context to AI
                    const sampleTestCase = generatedTestCases && Object.values(generatedTestCases).length > 0
                        ? {
                            input: Object.values(generatedTestCases)[0].input,
                            expected_output: Object.values(generatedTestCases)[0].output
                        }
                        : undefined;

                    const res = await getCodeCompletion(
                        prefix,
                        currentLine,
                        selectedLanguage,
                        problemDetails.title, // Pass problem title
                        sampleTestCase // Pass sample test case
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

        return () => {
            providerRegistration.dispose();
            keyDownListener.dispose();
            document.head.removeChild(styleElement);
        };
    }, [monacoInstance, editorInstance, selectedLanguage, problemDetails, generatedTestCases, isDark]);

    // Add mounted state
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    function onEditorMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
        editorRef.current = editor;
        setEditorInstance(editor);
        setMonacoInstance(monaco);
        monacoRef.current = monaco;
        editor.getAction('editor.action.toggleTabFocusMode')?.run();
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
        setConvertedCode('');
        setActiveEditorTab('editor');
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
                    details
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

    const handleGetHint = async () => {
        if (!editorRef.current || !problemDetails) return;

        const currentCode = editorRef.current.getValue();
        setIsLoadingHint(true);
        setHintError(null);

        try {
            const response = await getAIHint(
                problemDetails.formatted_statement,
                currentCode,
                selectedLanguage
            ) as AIHintResponse;

            const maxHints = problemDetails.difficulty === 'Easy' ? 1 :
                problemDetails.difficulty === 'Medium' ? 2 : 3;

            const limitedHints = response.hints.slice(0, maxHints);
            setHints(limitedHints);
            setVisibleHintIndex(0);
        } catch (error) {
            console.error("Error getting hints:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to get hints. Please try again.";
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

    const handleSubmitCode = async () => {
        if (!editorRef.current) return;

        const currentCode = editorRef.current.getValue();
        if (!currentCode.trim()) {
            setExecutionError("Code cannot be empty");
            return;
        }

        if (!problemDetails?.problem_id) {
            setExecutionError("Problem details must be generated before submitting.");
            return;
        }

        setExecutionError(null);
        setIsSubmitting(true);

        try {
            const response = await submitSolution(
                problemDetails.problem_id,
                selectedLanguage,
                currentCode
            ) as SubmitSolutionResponse;

            const submissionId = response.submission_id;

            if (submissionId) {
                // New logic: switch to submissions tab, fetch all submissions, and select the new one.
                setCurrentTab('submissions');
                await fetchSubmissions(); // This will re-fetch the list, including the new one.
                const details = await getSubmissionDetails(submissionId) as SubmissionDetail;
                setSelectedSubmission(details); // This will select it and trigger polling.
            } else {
                setExecutionError("Submission ID was not returned. Please try again.");
            }
        } catch (error) {
            console.error("Error submitting code:", error);
            setExecutionError(error instanceof Error ? error.message : "Failed to submit solution.");
        } finally {
            setIsSubmitting(false);
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

    // Enhanced difficulty configuration
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

    // If not logged in, show access denied with enhanced UI
    if (!isLoading && !isLoggedIn) {
        return (
            <div className="page-background flex flex-col justify-center items-center p-4">
                <GlassCard className="text-center max-w-md" padding="lg">
                    <AlertCircle className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                    <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Access Denied</h2>
                    <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>You must be logged in to create problems.</p>
                    <AnimatedButton
                        href="/login"
                        variant="primary"
                        gradient={true}
                    >
                        Log In
                    </AnimatedButton>
                </GlassCard>
            </div>
        );
    }

    // If loading, show enhanced loading spinner
    if (isLoading) {
        return (
            <div className="page-background flex justify-center items-center">
                <div className="text-center">
                    <div className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent`}></div>
                    <p className={`mt-4 text-xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!hasMounted) return null;

    return (
        <>
            <Head>
                <title>Create Problem - CodeSorted</title>
                <meta name="description" content="Create a new coding challenge problem" />
            </Head>


            <div className="page-background">
                <ResizablePanelGroup direction="horizontal" className="min-h-screen">
                    {/* Left Panel: Problem Description */}
                    <ResizablePanel defaultSize={40} minSize={30}>
                        <div className={`h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-r`}>

                            {/* Enhanced Header */}
                            <div className={`p-4 border-b transition-colors duration-300 ${isDark ? 'border-gray-800 bg-black/50' : 'border-gray-200 bg-gray-50/50'
                                } backdrop-blur-sm`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <AnimatedButton
                                                href="/problems"
                                                variant="ghost"
                                                size="sm"
                                                icon={ChevronLeft}
                                            >
                                                Back
                                            </AnimatedButton>
                                        </div>
                                        <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Create New Problem
                                        </h1>
                                        {problemView === 'preview' && problemDetails && (
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getDifficultyConfig(problemDetails.difficulty).color}`}>
                                                    {problemDetails.difficulty}
                                                </span>
                                                {problemDetails.tags && problemDetails.tags.map((tag, index) => (
                                                    <span key={index} className={`px-2 py-1 text-xs font-medium rounded-md ${isDark
                                                        ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                                                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        }`}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {problemView === 'preview' && problemDetails && (
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const config = getDifficultyConfig(problemDetails.difficulty);
                                                const Icon = config.icon;
                                                return (
                                                    <div className={`p-3 rounded-full bg-gradient-to-r ${config.gradient}`}>
                                                        <Icon className="w-5 h-5 text-white" />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Problem Stats */}
                                {problemView === 'preview' && (
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { icon: Timer, label: 'Time Limit', value: '1s' },
                                            { icon: MemoryStick, label: 'Memory Limit', value: '256MB' },
                                            { icon: Eye, label: 'Difficulty', value: problemDetails?.difficulty || 'Easy' }
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
                                )}
                            </div>

                            {/* Enhanced Tab Navigation */}
                            {problemView === 'preview' && (
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
                                                className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-all duration-300 ${tab.id === currentTab
                                                    ? isDark
                                                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/20'
                                                        : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                                    : isDark
                                                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                                    }`}
                                                onClick={() => {
                                                    setCurrentTab(tab.id);
                                                    if (tab.id === 'submissions') {
                                                        fetchSubmissions();
                                                    }
                                                }}
                                            >
                                                <tab.icon className="w-4 h-4" />
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Problem Input or Preview */}
                            <div className="overflow-y-auto flex-grow">
                                {problemView === 'input' ? (
                                    <div className="p-6 space-y-6">
                                        {/* Welcome Card with collapsible functionality */}
                                        <GlassCard className="relative overflow-hidden" padding={welcomeCardCollapsed ? "sm" : "lg"} glow={true}>
                                            <StaticSprinkler className={`absolute inset-0 ${welcomeCardCollapsed ? "opacity-30" : ""}`} />
                                            {/* Dismiss/Collapse toggle button */}
                                            <button
                                                onClick={() => setWelcomeCardCollapsed(!welcomeCardCollapsed)}
                                                className={`absolute top-4 right-4 z-20 p-2 rounded-full transition-all duration-200 ${isDark
                                                    ? 'bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 hover:text-white'
                                                    : 'bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900'
                                                    } backdrop-blur-sm`}
                                                aria-label={welcomeCardCollapsed ? "Expand welcome card" : "Collapse welcome card"}
                                            >
                                                {welcomeCardCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                            </button>
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-center gap-3 mb-4">
                                                    <Sparkles className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                                    <h2 className={`text-2xl font-bold bg-gradient-to-r ${isDark
                                                        ? 'from-blue-400 via-purple-400 to-pink-400'
                                                        : 'from-blue-600 via-purple-600 to-pink-600'
                                                        } bg-clip-text text-transparent`}>
                                                        AI-Powered Problem Creator
                                                    </h2>
                                                    <Sparkles className={`w-8 h-8 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                                                </div>

                                                {/* Card details that can be collapsed */}
                                                {!welcomeCardCollapsed && (
                                                    <>
                                                        <p className={`text-lg mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            Transform your ideas into professional coding challenges
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-4 text-center">
                                                            {[
                                                                { icon: Lightbulb, label: 'AI Analysis', desc: 'Smart formatting' },
                                                                { icon: Target, label: 'Auto Test Cases', desc: 'Generated automatically' },
                                                                { icon: Sparkles, label: 'Professional', desc: 'Ready to publish' }
                                                            ].map((feature, index) => (
                                                                <div key={index} className={`p-3 rounded-lg backdrop-blur-sm ${isDark ? 'bg-white/5' : 'bg-white/20'}`}>
                                                                    <feature.icon className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                                                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                        {feature.label}
                                                                    </div>
                                                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                        {feature.desc}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </GlassCard>

                                        <div>
                                            <label htmlFor="rawProblemStatement" className={`block text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Enter Problem Statement
                                            </label>
                                            <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Describe your problem, including the task, examples, and constraints if possible.
                                                The AI will help structure and format it properly.
                                            </p>
                                            <div className="relative">
                                                <Textarea
                                                    id="rawProblemStatement"
                                                    value={rawProblemStatement}
                                                    onChange={(e) => setRawProblemStatement(e.target.value)}
                                                    placeholder="Add the problem statement here"
                                                    className={`w-full min-h-[400px] font-mono text-sm transition-colors duration-300 ${isDark
                                                        ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500'
                                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                                                        } focus:ring-2 focus:ring-blue-500/20`}
                                                />
                                            </div>
                                        </div>

                                        <AnimatedButton
                                            onClick={handleGenerateProblemDetails}
                                            disabled={isGeneratingDetails || !rawProblemStatement}
                                            variant="primary"
                                            className="w-full"
                                            loading={isGeneratingDetails}
                                            gradient={true}
                                            glow={true}
                                        >
                                            {isGeneratingDetails ? 'Generating Problem...' : 'Generate Problem'}
                                        </AnimatedButton>

                                        {error && (
                                            <GlassCard className={`border ${isDark ? 'border-red-500/30 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
                                                <div className={`flex items-start gap-3 ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                                                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                                    <p>{error}</p>
                                                </div>
                                            </GlassCard>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-6">
                                        {currentTab === 'description' && (
                                            <>
                                                {/* Problem Preview */}
                                                <div className="flex justify-between items-center mb-4">
                                                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        Problem Preview
                                                    </h2>
                                                    <AnimatedButton
                                                        onClick={() => setProblemView('input')}
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        Edit Original
                                                    </AnimatedButton>
                                                </div>

                                                {problemDetails && (
                                                    <div className="space-y-6">
                                                        {/* Problem Statement */}
                                                        <div>
                                                            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                Problem Statement
                                                            </h2>
                                                            <GlassCard padding="lg">
                                                                <div className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
                                                                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                                                        {renderMarkdown(problemDetails.formatted_statement)}
                                                                    </p>
                                                                </div>
                                                            </GlassCard>
                                                        </div>

                                                        {/* Examples Section */}
                                                        <div>
                                                            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                Examples
                                                            </h2>
                                                            <div className="space-y-4">
                                                                {parseExamples(problemDetails.formatted_statement).map((example, idx) => (
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
                                                                                <div className={`p-3 rounded-lg font-mono text-sm ${isDark ? 'bg-gray-900 text-green-400' : 'bg-gray-900 text-white'}`}>
                                                                                    {example.input}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                                    Output:
                                                                                </div>
                                                                                <div className={`p-3 rounded-lg font-mono text-sm ${isDark ? 'bg-gray-900 text-blue-400' : 'bg-gray-900 text-white'}`}>
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
                                                                    {problemDetails.constraints.split('\n').filter(c => c.trim()).map((constraint, idx) => (
                                                                        <li key={idx} className="text-sm font-mono">{constraint}</li>
                                                                    ))}
                                                                </ul>
                                                            </GlassCard>
                                                        </div>

                                                        {/* Enhanced AI Hints Section */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                    <Lightbulb className="w-5 h-5 text-blue-500" />
                                                                    AI Hints
                                                                    <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                                                        }`}>
                                                                        {problemDetails.difficulty === 'Easy' ? '1 hint' :
                                                                            problemDetails.difficulty === 'Medium' ? '2 hints' : '3 hints'} available
                                                                    </span>
                                                                </h2>
                                                                {!isLoadingHint && !hints && (
                                                                    <AnimatedButton
                                                                        onClick={handleGetHint}
                                                                        variant="primary"
                                                                        size="sm"
                                                                        icon={Sparkles}
                                                                        glow={true}
                                                                    >
                                                                        Get Hint
                                                                    </AnimatedButton>
                                                                )}
                                                            </div>

                                                            <GlassCard padding="lg">
                                                                {isLoadingHint ? (
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
                                                                                    ? 'bg-blue-900/20 border-blue-500/30'
                                                                                    : 'bg-blue-50 border-blue-200'
                                                                                : isDark
                                                                                    ? 'bg-gray-700/30 border-gray-600/30'
                                                                                    : 'bg-gray-50 border-gray-200'
                                                                                }`}>
                                                                                <div className="flex items-start gap-3">
                                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-blue-600 text-blue-100' : 'bg-blue-500 text-blue-50'
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
                                                                                onClick={handleShowNextHint}
                                                                                variant="primary"
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

                                                        {/* Test Cases Section */}
                                                        <div>
                                                            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                Test Cases
                                                            </h2>
                                                            {isGeneratingTestCases ? (
                                                                <GlassCard padding="lg">
                                                                    <div className="flex items-center justify-center p-4">
                                                                        <Loader className="w-6 h-6 mr-3 animate-spin text-blue-500" />
                                                                        <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                                                                            Generating test cases...
                                                                        </span>
                                                                    </div>
                                                                </GlassCard>
                                                            ) : testCaseError ? (
                                                                <GlassCard className={`border ${isDark ? 'border-red-500/30 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
                                                                    <div className={`flex items-start gap-3 ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                                                                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                                                        <p>{testCaseError}</p>
                                                                    </div>
                                                                </GlassCard>
                                                            ) : generatedTestCases ? (
                                                                <div>
                                                                    <GlassCard padding="lg" className="mb-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                                    <span className="font-medium">{Object.keys(generatedTestCases).length}</span> test cases generated
                                                                                    (<span className="font-medium">{selectedSampleCount}</span> will be visible to users)
                                                                                </p>
                                                                            </div>
                                                                            <Select value={selectedSampleCount.toString()} onValueChange={(value) => setSelectedSampleCount(parseInt(value))}>
                                                                                <SelectTrigger className={`w-20 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}>
                                                                                    <SelectValue />
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
                                                                    </GlassCard>

                                                                    <div className="space-y-4">
                                                                        {testCases.slice(0, selectedSampleCount).map((tc, index) => (
                                                                            <GlassCard key={index} className="overflow-hidden" padding="none">
                                                                                <div className={`p-3 border-b ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50/50 border-gray-200'}`}>
                                                                                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                                                                                        Sample Case {index + 1}
                                                                                    </h4>
                                                                                </div>
                                                                                <div className="p-4 space-y-3">
                                                                                    <div>
                                                                                        <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Input:</div>
                                                                                        <div className={`p-3 rounded-lg font-mono text-sm ${isDark ? 'bg-gray-900 text-green-400' : 'bg-gray-900 text-white'}`}>
                                                                                            {formatDisplayInput(tc.input)}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Expected Output:</div>
                                                                                        <div className={`p-3 rounded-lg font-mono text-sm ${isDark ? 'bg-gray-900 text-blue-400' : 'bg-gray-900 text-white'}`}>
                                                                                            {tc.expectedOutput}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </GlassCard>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <GlassCard padding="lg">
                                                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                        No test cases generated yet
                                                                    </p>
                                                                </GlassCard>
                                                            )}
                                                        </div>

                                                        {/* Create Problem Button */}
                                                        <div className="pt-4">
                                                            <AnimatedButton
                                                                onClick={handleCreateProblem}
                                                                disabled={isCreatingProblem}
                                                                variant="success"
                                                                className="w-full"
                                                                loading={isCreatingProblem}
                                                                gradient={true}
                                                                glow={true}
                                                            >
                                                                {isCreatingProblem ? 'Creating Problem...' : 'Create Problem'}
                                                            </AnimatedButton>

                                                            {createdProblemId && (
                                                                <GlassCard className={`mt-4 border ${isDark ? 'border-green-500/30 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
                                                                    <div className={`flex items-start gap-3 ${isDark ? 'text-green-400' : 'text-green-800'}`}>
                                                                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                                                        <div>
                                                                            <p className="font-medium">Problem created successfully!</p>
                                                                            <p className="text-sm">Redirecting to the problem page...</p>
                                                                        </div>
                                                                    </div>
                                                                </GlassCard>
                                                            )}

                                                            {error && (
                                                                <GlassCard className={`mt-4 border ${isDark ? 'border-red-500/30 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
                                                                    <div className={`flex items-start gap-3 ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                                                                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                                                        <p>{error}</p>
                                                                    </div>
                                                                </GlassCard>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {currentTab === 'discussion' && (
                                            <GlassCard className="text-center" padding="lg">
                                                <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    Discussion Coming Soon
                                                </h3>
                                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Discussion features are being enhanced with the new design system.
                                                </p>
                                            </GlassCard>
                                        )}
                                        {currentTab === 'submissions' && (
                                            <div className="p-6">
                                                {isLoadingSubmissions ? (
                                                    <div className="flex justify-center items-center p-8">
                                                        <Loader className="w-6 h-6 animate-spin text-blue-500" />
                                                    </div>
                                                ) : selectedSubmission ? (
                                                    <SubmissionDetailView
                                                        submission={selectedSubmission}
                                                        stats={problemStats}
                                                        onBack={() => setSelectedSubmission(null)}
                                                        isDark={!!isDark}
                                                        customTestCases={testCases}
                                                        setCustomTestCases={setTestCases}
                                                        setActiveTestCase={setActiveTestCaseIndex}
                                                    />
                                                ) : submissions.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {submissions.map((sub) => (
                                                            <GlassCard
                                                                key={sub.id}
                                                                padding="md"
                                                                className="cursor-pointer hover:bg-white/10 transition-colors duration-200"
                                                                onClick={async () => {
                                                                    const details = await getSubmissionDetails(sub.id) as SubmissionDetail;
                                                                    setSelectedSubmission(details)
                                                                }}
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={getStatusClass(sub.status, !!isDark)}>
                                                                            {sub.status.replace(/_/g, ' ')}
                                                                        </span>
                                                                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            {sub.language}
                                                                        </span>
                                                                    </div>
                                                                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                        {new Date(sub.submitted_at).toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            </GlassCard>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <GlassCard className="text-center" padding="lg">
                                                        <FileText className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                                        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            No Submissions Yet
                                                        </h3>
                                                        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {isLoggedIn ?
                                                                'Submissions for this problem will appear here.' :
                                                                <>Please <Link href="/login" className="underline font-medium">sign in</Link> to see your submissions.</>
                                                            }
                                                        </p>
                                                    </GlassCard>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel: Enhanced Code Editor */}
                    <ResizablePanel defaultSize={60} minSize={40}>
                        <div className={`h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-white'
                            }`}>
                            {/* Enhanced Language Selector */}
                            <div className={`p-4 border-b transition-colors duration-300 ${isDark ? 'border-gray-800 bg-black/50' : 'border-gray-200 bg-gray-50/50'
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
                                            disabled={!problemDetails}
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
                                            <div className={`flex items-center px-4 py-2 border-b transition-colors duration-300 ${isDark ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="flex">
                                                    <button
                                                        className={`px-4 py-2 text-sm rounded-tl rounded-bl transition-all duration-300 ${activeEditorTab === 'editor'
                                                            ? isDark
                                                                ? 'bg-gray-700 text-white border border-gray-600'
                                                                : 'bg-white text-gray-900 border border-gray-300'
                                                            : isDark
                                                                ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                                                : 'bg-gray-200 text-gray-700 hover:text-gray-900'
                                                            }`}
                                                        onClick={() => setActiveEditorTab('editor')}
                                                    >
                                                        <Code2 className="w-4 h-4 inline-block mr-2" />
                                                        Editor
                                                    </button>
                                                    {selectedLanguage === 'pseudocode' && convertedCode && (
                                                        <button
                                                            className={`px-4 py-2 text-sm rounded-tr rounded-br transition-all duration-300 ${activeEditorTab === 'converted'
                                                                ? isDark
                                                                    ? 'bg-gray-700 text-white border border-gray-600'
                                                                    : 'bg-white text-gray-900 border border-gray-300'
                                                                : isDark
                                                                    ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                                                                    : 'bg-gray-200 text-gray-700 hover:text-gray-900'
                                                                }`}
                                                            onClick={() => setActiveEditorTab('converted')}
                                                        >
                                                            <Sparkles className="w-4 h-4 inline-block mr-2" />
                                                            AI Generated
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {activeEditorTab === 'editor' ? (
                                                <div className="flex-grow">
                                                    <Editor
                                                        height="100%"
                                                        language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                                                        value={code}
                                                        onChange={handleEditorChange}
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
                                        <div className={`h-full flex flex-col transition-colors duration-300 ${isDark ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}>
                                            {/* Enhanced Test Case Tabs */}
                                            <div className={`h-12 border-b flex items-center px-4 transition-colors duration-300 ${isDark ? 'bg-black border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                                <div className="flex items-center gap-2 overflow-x-auto">
                                                    {testCases.map((_, index) => {
                                                        // Determine test case status for styling
                                                        const result = allExecutionResults && allExecutionResults[index];
                                                        let statusIndicator = null;
                                                        let borderClass = '';

                                                        if (result) {
                                                            const testCase = testCases[index];
                                                            const isCorrect = result.status === 'success' &&
                                                                testCase &&
                                                                result.stdout.trim() === (testCase.expectedOutput || '').trim();

                                                            if (isCorrect) {
                                                                statusIndicator = <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
                                                                borderClass = 'border-green-500/50';
                                                            } else if (result.status === 'success') {
                                                                statusIndicator = <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
                                                                borderClass = 'border-red-500/50';
                                                            } else {
                                                                statusIndicator = <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
                                                                borderClass = 'border-yellow-500/50';
                                                            }
                                                        } else {
                                                            // Add grey dot for test cases that haven't been run yet
                                                            statusIndicator = <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
                                                            borderClass = 'border-gray-400/50';
                                                        }

                                                        return (
                                                            <button
                                                                key={index}
                                                                className={`px-3 py-1 text-xs rounded-full flex-shrink-0 transition-all duration-300 flex items-center gap-2 border ${activeTestCaseIndex === index
                                                                    ? `bg-blue-600 text-white shadow-lg ${borderClass}`
                                                                    : isDark
                                                                        ? `bg-gray-700 text-gray-300 hover:bg-gray-600 ${borderClass || 'border-transparent'}`
                                                                        : `bg-gray-200 text-gray-700 hover:bg-gray-300 ${borderClass || 'border-transparent'}`
                                                                    }`}
                                                                onClick={() => setActiveTestCaseIndex(index)}
                                                            >
                                                                {statusIndicator}
                                                                Case {index + 1}
                                                            </button>
                                                        );
                                                    })}
                                                    <AnimatedButton
                                                        onClick={() => setTestCases([...testCases, { input: '', expectedOutput: '' }])}
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
                                                            value={formattedInput}
                                                            onChange={(e) => {
                                                                setFormattedInput(e.target.value);
                                                                const updatedTestCases = [...testCases];
                                                                updatedTestCases[activeTestCaseIndex] = {
                                                                    ...updatedTestCases[activeTestCaseIndex],
                                                                    input: parseFormattedInput(e.target.value)
                                                                };
                                                                setTestCases(updatedTestCases);
                                                            }}
                                                            placeholder="Enter input for this test case..."
                                                            rows={Math.max(3, (formattedInput || '').split('\n').length)}
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
                                                            value={testCases[activeTestCaseIndex]?.expectedOutput || ''}
                                                            onChange={(e) => {
                                                                const updatedTestCases = [...testCases];
                                                                updatedTestCases[activeTestCaseIndex] = {
                                                                    ...updatedTestCases[activeTestCaseIndex],
                                                                    expectedOutput: e.target.value
                                                                };
                                                                setTestCases(updatedTestCases);
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
                                                        ) : allExecutionResults && allExecutionResults[activeTestCaseIndex] ? (
                                                            (() => {
                                                                const result = allExecutionResults[activeTestCaseIndex];
                                                                const testCase = testCases[activeTestCaseIndex];

                                                                let statusText = 'Failed';
                                                                let statusColor = 'text-red-400';

                                                                if (result.status === 'success') {
                                                                    const isCorrect = testCase && result.stdout.trim() === (testCase.expectedOutput || '').trim();
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

                                                                        {testCase?.expectedOutput && (
                                                                            <div>
                                                                                <div className="font-semibold text-xs mb-2 text-green-400">Expected Output:</div>
                                                                                <div className={`pl-3 border-l-2 border-green-500 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                                    {testCase.expectedOutput}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <div className={`flex items-center justify-between text-xs pt-3 border-t ${isDark ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
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

// Helper function to parse formatted input
function parseFormattedInput(formattedInput: string): string {
    // Convert formatted input back to raw input format
    try {
        const lines = formattedInput.split('\n').filter(line => line.trim());
        if (lines.length === 0) return '';

        // If it looks like key=value format, convert to JSON
        if (lines.some(line => line.includes('='))) {
            const obj: Record<string, any> = {};
            lines.forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    try {
                        obj[key.trim()] = JSON.parse(value);
                    } catch {
                        obj[key.trim()] = value.replace(/^["']|["']$/g, '');
                    }
                }
            });
            return JSON.stringify(obj);
        }

        return formattedInput;
    } catch {
        return formattedInput;
    }
}

// Helper function to format display input
function formatDisplayInput(input: string): string {
    if (!input) return '';

    try {
        const parsed = JSON.parse(input);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return Object.entries(parsed)
                .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
                .join('\n');
        }
        return input;
    } catch {
        return input;
    }
}

// Helper function to parse examples from problem statement
const parseExamples = (statement: string): Array<{ input: string; output: string; explanation?: string }> => {
    const examples: Array<{ input: string; output: string; explanation?: string }> = [];

    // Try to match different example formats
    const examplePatterns = [
        /Example\s+\d+:[\s\S]*?Input:\s*([^\n]*(?:\n(?!Output:).*)*)\s*Output:\s*([^\n]*(?:\n(?!Explanation:|Example).*)*)\s*(?:Explanation:\s*([\s\S]*?)(?=Example\s+\d+:|$))?/gi,
        /Input:\s*([^\n]*(?:\n(?!Output:).*)*)\s*Output:\s*([^\n]*(?:\n(?!Input:|Example).*)*)/gi
    ];

    for (const pattern of examplePatterns) {
        const matches = [...statement.matchAll(pattern)];

        matches.forEach(match => {
            const input = match[1]?.trim().replace(/^`|`$/g, '') || '';
            const output = match[2]?.trim().replace(/^`|`$/g, '') || '';
            const explanation = match[3]?.trim().replace(/^`|`$/g, '');

            if (input && output) {
                examples.push({
                    input,
                    output,
                    explanation: explanation || undefined
                });
            }
        });

        if (examples.length > 0) break;
    }

    return examples;
};

// New component for the complexity chart
const ComplexityAnalysis: React.FC<{
    title: string;
    userComplexity: string | undefined;
    percentile: number;
    distribution: { [key: string]: number } | undefined;
    isDark: boolean;
}> = ({ title, userComplexity, percentile, distribution, isDark }) => {
    if (!userComplexity || !distribution) {
        return null;
    }

    const chartData = complexityOrder
        .filter(c => distribution[c] > 0)
        .map(c => ({
            name: c,
            count: distribution[c],
            isCurrentUser: c === userComplexity
        }));

    return (
        <GlassCard padding="lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    {userComplexity}
                </span>
            </div>
            <div className="text-left mb-4">
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{percentile.toFixed(1)}%</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Beats percentile of submissions</p>
            </div>
            <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: isDark ? '#a0aec0' : '#4a5568' }} />
                        <YAxis tick={{ fontSize: 12, fill: isDark ? '#a0aec0' : '#4a5568' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#2D3748' : '#FFFFFF',
                                border: `1px solid ${isDark ? '#4A5568' : '#E2E8F0'}`,
                                color: isDark ? '#FFFFFF' : '#1A202C'
                            }}
                            labelStyle={{ color: isDark ? '#FFFFFF' : '#1A202C' }}
                            cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="count" name="Submissions">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isCurrentUser ? '#6366f1' : (isDark ? '#4a5568' : '#a5b4fc')} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
    );
};

const SubmissionDetailView: React.FC<{
    submission: SubmissionDetail;
    stats: ProblemStats | null;
    onBack: () => void;
    isDark: boolean;
    customTestCases: { input: string; expectedOutput: string; }[];
    setCustomTestCases: React.Dispatch<React.SetStateAction<{ input: string; expectedOutput: string; }[]>>;
    setActiveTestCase: React.Dispatch<React.SetStateAction<number>>;
}> = ({ submission, stats, onBack, isDark, customTestCases, setCustomTestCases, setActiveTestCase }) => {

    const timePercentile = submission.time_complexity && stats ? calculatePercentile(submission.time_complexity, stats.time_complexity_distribution) : 0;
    const memoryPercentile = submission.memory_complexity && stats ? calculatePercentile(submission.memory_complexity, stats.memory_complexity_distribution) : 0;

    return (
        <div className="space-y-6">
            <AnimatedButton onClick={onBack} variant="ghost" size="sm" icon={ChevronLeft}>
                Back to Submissions
            </AnimatedButton>

            <GlassCard padding="lg">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Submission Details</h2>
                    <span className={getStatusClass(submission.status, !!isDark)}>
                        {submission.status.replace(/_/g, ' ')}
                    </span>
                </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard padding="md"><div className="text-sm">Runtime</div><div className="text-xl font-bold">{submission.execution_time_ms} ms</div></GlassCard>
                <GlassCard padding="md"><div className="text-sm">Memory</div><div className="text-xl font-bold">{(submission.memory_used_kb / 1024).toFixed(2)} MB</div></GlassCard>
                <GlassCard padding="md"><div className="text-sm">Testcases</div><div className="text-xl font-bold">{submission.test_cases_passed} / {submission.test_cases_total}</div></GlassCard>
            </div>

            {submission.status !== "ACCEPTED" && submission.failed_test_case_details && (
                <GlassCard padding="lg">
                    <h3 className="text-lg font-semibold mb-4 text-red-400">Test Case Failed</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm">
                        <div className="p-3 bg-black/30 rounded-lg"><span className="font-semibold text-gray-400">Input:</span><pre className="whitespace-pre-wrap mt-1">{formatDisplayInput(submission.failed_test_case_details.input)}</pre></div>
                        <div className="p-3 bg-black/30 rounded-lg"><span className="font-semibold text-gray-400">Expected:</span><pre className="whitespace-pre-wrap mt-1">{submission.failed_test_case_details.expected_output}</pre></div>
                        <div className="p-3 bg-black/30 rounded-lg"><span className="font-semibold text-red-400">Output:</span><pre className="whitespace-pre-wrap mt-1">{submission.failed_test_case_details.actual_output}</pre></div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <AnimatedButton
                            size="sm"
                            variant="primary"
                            icon={Plus}
                            onClick={() => {
                                if (!submission.failed_test_case_details) return;
                                const newTestCase = {
                                    input: submission.failed_test_case_details.input,
                                    expectedOutput: submission.failed_test_case_details.expected_output
                                };
                                setCustomTestCases(prevTestCases => {
                                    const newTestCases = [...prevTestCases, newTestCase];
                                    setActiveTestCase(newTestCases.length - 1);
                                    return newTestCases;
                                });
                            }}
                        >
                            Add as Test Case
                        </AnimatedButton>
                    </div>
                </GlassCard>
            )}

            {submission.status === "ACCEPTED" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ComplexityAnalysis
                        title="Time Complexity"
                        userComplexity={submission.time_complexity}
                        percentile={timePercentile}
                        distribution={stats?.time_complexity_distribution}
                        isDark={isDark}
                    />
                    <ComplexityAnalysis
                        title="Memory Complexity"
                        userComplexity={submission.memory_complexity}
                        percentile={memoryPercentile}
                        distribution={stats?.memory_complexity_distribution}
                        isDark={isDark}
                    />
                </div>
            )}
        </div>
    )
};
