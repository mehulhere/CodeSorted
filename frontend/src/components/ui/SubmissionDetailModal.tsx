import React, { useState } from 'react';
import { X, Code, Clock, User, FileText, AlertCircle, CheckCircle, XCircle, Copy, Download } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import AnimatedButton from './AnimatedButton';

interface SubmissionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    submission: {
        id: string;
        username: string;
        problem_id: string;
        problem_title: string;
        language: string;
        status: string;
        execution_time_ms: number;
        submitted_at: string;
        code?: string;
        memory_usage?: number;
        test_cases_passed?: number;
        total_test_cases?: number;
        error_message?: string;
    } | null;
}

const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({ 
    isOpen, 
    onClose, 
    submission 
}) => {
    const { isDark } = useTheme();
    const [copied, setCopied] = useState(false);

    if (!isOpen || !submission) return null;

    const getStatusConfig = (status: string) => {
        const configs = {
            'ACCEPTED': {
                icon: CheckCircle,
                color: 'text-green-500',
                bg: isDark ? 'bg-green-900/20' : 'bg-green-50',
                border: 'border-green-200',
                text: 'Accepted'
            },
            'WRONG_ANSWER': {
                icon: XCircle,
                color: 'text-red-500',
                bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
                border: 'border-red-200',
                text: 'Wrong Answer'
            },
            'TIME_LIMIT_EXCEEDED': {
                icon: Clock,
                color: 'text-yellow-500',
                bg: isDark ? 'bg-yellow-900/20' : 'bg-yellow-50',
                border: 'border-yellow-200',
                text: 'Time Limit Exceeded'
            },
            'RUNTIME_ERROR': {
                icon: AlertCircle,
                color: 'text-orange-500',
                bg: isDark ? 'bg-orange-900/20' : 'bg-orange-50',
                border: 'border-orange-200',
                text: 'Runtime Error'
            },
            'COMPILATION_ERROR': {
                icon: AlertCircle,
                color: 'text-red-500',
                bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
                border: 'border-red-200',
                text: 'Compilation Error'
            }
        };
        return configs[status as keyof typeof configs] || configs['WRONG_ANSWER'];
    };

    const config = getStatusConfig(submission.status);
    const StatusIcon = config.icon;

    const copyCode = async () => {
        if (submission.code) {
            await navigator.clipboard.writeText(submission.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadCode = () => {
        if (submission.code) {
            const element = document.createElement('a');
            const file = new Blob([submission.code], { type: 'text/plain' });
            element.href = URL.createObjectURL(file);
            element.download = `submission_${submission.id}.${getFileExtension(submission.language)}`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    };

    const getFileExtension = (language: string) => {
        const extensions: { [key: string]: string } = {
            'python': 'py',
            'javascript': 'js',
            'cpp': 'cpp',
            'java': 'java',
            'c': 'c'
        };
        return extensions[language.toLowerCase()] || 'txt';
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                {/* Backdrop */}
                <div 
                    className="fixed inset-0 transition-opacity bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                {/* Modal */}
                <div className={`relative z-50 w-full max-w-4xl mx-auto transform transition-all ${isDark ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-2xl`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${config.bg} ${config.border} border`}>
                                <StatusIcon className={`w-6 h-6 ${config.color}`} />
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Submission Details
                                </h2>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {submission.problem_title} • {config.text}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <User className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        User
                                    </span>
                                </div>
                                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {submission.username}
                                </p>
                            </div>

                            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Code className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Language
                                    </span>
                                </div>
                                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {submission.language}
                                </p>
                            </div>

                            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Runtime
                                    </span>
                                </div>
                                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {submission.execution_time_ms > 0 ? `${submission.execution_time_ms}ms` : 'N/A'}
                                </p>
                            </div>

                            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Test Cases
                                    </span>
                                </div>
                                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {submission.test_cases_passed || 0}/{submission.total_test_cases || 0}
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {submission.error_message && (
                            <div className={`p-4 rounded-lg border ${config.bg} ${config.border} mb-6`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className={`w-4 h-4 ${config.color}`} />
                                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Error Details
                                    </span>
                                </div>
                                <pre className={`text-xs font-mono whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {submission.error_message}
                                </pre>
                            </div>
                        )}

                        {/* Code Section */}
                        {submission.code && (
                            <div className={`rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                                <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <Code className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Source Code
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AnimatedButton
                                            onClick={copyCode}
                                            variant="ghost"
                                            size="sm"
                                            icon={Copy}
                                        >
                                            {copied ? 'Copied!' : 'Copy'}
                                        </AnimatedButton>
                                        <AnimatedButton
                                            onClick={downloadCode}
                                            variant="ghost"
                                            size="sm"
                                            icon={Download}
                                        >
                                            Download
                                        </AnimatedButton>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <pre className={`text-sm font-mono whitespace-pre-wrap overflow-x-auto ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {submission.code}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Submission Info
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Submission ID:
                                    </span>
                                    <p className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {submission.id}
                                    </p>
                                </div>
                                <div>
                                    <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Submitted At:
                                    </span>
                                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {new Date(submission.submitted_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionDetailModal;