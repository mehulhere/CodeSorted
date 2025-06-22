import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader, AlertCircle } from 'lucide-react';
import { generateBruteForceSolution, generateExpectedOutputs, generateTestCases, ProblemDetails } from '@/lib/api';

// Custom auth hook
const useAuthStatus = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // For demo purposes, we'll just assume the user is logged in
        // In a real app, you would check the auth status from an API or local storage
        setIsLoggedIn(true);
        setIsLoading(false);
    }, []);

    return { isLoading, isLoggedIn };
};

// Define response types
interface BruteForceSolutionResponse {
    solution: string;
    language: string;
}

interface TestCasesResponse {
    test_cases: Record<string, any>;
}

interface ExpectedOutputsResponse {
    expected_outputs: Record<string, string>;
}

// Create a simple Alert component since we don't have the ui/alert component
const Alert = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-4 border rounded-md ${className}`}>{children}</div>
);

const AlertTitle = ({ children }: { children: React.ReactNode }) => (
    <h5 className="font-medium mb-1">{children}</h5>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
);

export default function GenerateSolutionsPage() {
    const router = useRouter();
    const { isLoading, isLoggedIn } = useAuthStatus();

    const [problemStatement, setProblemStatement] = useState('');
    const [language, setLanguage] = useState('python');
    const [solution, setSolution] = useState('');
    const [testCases, setTestCases] = useState<Record<string, any>>({});
    const [expectedOutputs, setExpectedOutputs] = useState<Record<string, string>>({});

    const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);
    const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
    const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateSolution = async () => {
        if (!problemStatement) {
            setError('Please enter a problem statement first');
            return;
        }

        setIsGeneratingSolution(true);
        setError(null);

        try {
            const response = await generateBruteForceSolution(problemStatement, language) as BruteForceSolutionResponse;
            setSolution(response.solution);
        } catch (err) {
            console.error('Failed to generate solution:', err);
            setError('Failed to generate solution. Please try again.');
        } finally {
            setIsGeneratingSolution(false);
        }
    };

    const handleGenerateTestCases = async () => {
        if (!problemStatement) {
            setError('Please enter a problem statement first');
            return;
        }

        setIsGeneratingTestCases(true);
        setError(null);

        try {
            // Create a ProblemDetails object from the problem statement
            const problemDetails: ProblemDetails = {
                title: "Generated Problem",
                formatted_statement: problemStatement,
                difficulty: "medium",
                constraints: "",
                tags: [],
                problem_id: `gen-${Date.now()}`
            };

            const response = await generateTestCases(problemDetails) as TestCasesResponse;
            setTestCases(response.test_cases);
        } catch (err) {
            console.error('Failed to generate test cases:', err);
            setError('Failed to generate test cases. Please try again.');
        } finally {
            setIsGeneratingTestCases(false);
        }
    };

    const handleGenerateExpectedOutputs = async () => {
        if (!problemStatement) {
            setError('Please enter a problem statement first');
            return;
        }

        if (Object.keys(testCases).length === 0) {
            setError('Please generate test cases first');
            return;
        }

        setIsGeneratingOutputs(true);
        setError(null);

        try {
            const response = await generateExpectedOutputs(problemStatement, testCases, language) as ExpectedOutputsResponse;
            setExpectedOutputs(response.expected_outputs);
        } catch (err) {
            console.error('Failed to generate expected outputs:', err);
            setError('Failed to generate expected outputs. Please try again.');
        } finally {
            setIsGeneratingOutputs(false);
        }
    };

    // If not logged in, show access denied
    if (!isLoading && !isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-4">You must be logged in to use this page.</p>
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
                <title>Generate Solutions - Online Judge</title>
            </Head>
            <div className="min-h-screen bg-gray-100 p-4">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Generate Solutions & Test Cases</h1>

                    {error && (
                        <Alert className="bg-red-50 border-red-200 text-red-800 mb-6">
                            <AlertCircle className="h-4 w-4 inline-block mr-2" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Problem Statement */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Problem Statement</CardTitle>
                                <CardDescription>Enter the problem description</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    placeholder="Enter the problem statement here..."
                                    className="min-h-[200px]"
                                    value={problemStatement}
                                    onChange={(e) => setProblemStatement(e.target.value)}
                                />
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <div className="flex items-center">
                                    <span className="mr-2">Language:</span>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="python">Python</SelectItem>
                                            <SelectItem value="javascript">JavaScript</SelectItem>
                                            <SelectItem value="cpp">C++</SelectItem>
                                            <SelectItem value="java">Java</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-x-2">
                                    <Button
                                        onClick={handleGenerateTestCases}
                                        disabled={isGeneratingTestCases || !problemStatement}
                                    >
                                        {isGeneratingTestCases ? (
                                            <>
                                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : "Generate Test Cases"}
                                    </Button>
                                    <Button
                                        onClick={handleGenerateSolution}
                                        disabled={isGeneratingSolution || !problemStatement}
                                    >
                                        {isGeneratingSolution ? (
                                            <>
                                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : "Generate Solution"}
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>

                        {/* Solution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Brute Force Solution</CardTitle>
                                <CardDescription>Generated solution prioritizing correctness</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {solution ? (
                                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[400px]">
                                        <code>{solution}</code>
                                    </pre>
                                ) : (
                                    <div className="text-gray-500 italic">
                                        Solution will appear here after generation
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Test Cases */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Test Cases</CardTitle>
                                <CardDescription>Generated test cases</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(testCases).length > 0 ? (
                                    <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[400px]">
                                        <pre>
                                            <code>{JSON.stringify(testCases, null, 2)}</code>
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic">
                                        Test cases will appear here after generation
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    onClick={handleGenerateExpectedOutputs}
                                    disabled={isGeneratingOutputs || Object.keys(testCases).length === 0}
                                    className="w-full"
                                >
                                    {isGeneratingOutputs ? (
                                        <>
                                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Expected Outputs...
                                        </>
                                    ) : "Generate Expected Outputs"}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Expected Outputs */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Expected Outputs</CardTitle>
                                <CardDescription>Generated from the brute force solution</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(expectedOutputs).length > 0 ? (
                                    <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[400px]">
                                        <pre>
                                            <code>{JSON.stringify(expectedOutputs, null, 2)}</code>
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic">
                                        Expected outputs will appear here after generation
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
} 