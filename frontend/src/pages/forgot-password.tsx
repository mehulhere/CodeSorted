import Head from 'next/head';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';
import '@/app/globals.css';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import FormInput, { validateEmail } from '@/components/ui/FormInput';

export default function ForgotPasswordPage() {
    const { isDark } = useTheme();
    const [email, setEmail] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!email) {
            setError('Email address is required.');
            setIsLoading(false);
            return;
        }

        const emailValidationError = validateEmail(email);
        if (emailValidationError) {
            setError(emailValidationError);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to send reset email. Please try again.');
                return;
            }

            setSuccess(true);
        } catch (err: any) {
            console.error('Forgot password request failed:', err);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Reset Password | CodeSorted</title>
                <meta name="description" content="Reset your CodeSorted account password" />
            </Head>

            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse ${isDark ? 'bg-indigo-600' : 'bg-indigo-400'}`} />
                    <div className={`absolute bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-2000 ${isDark ? 'bg-purple-600' : 'bg-purple-400'}`} />
                </div>

                <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md space-y-8">
                        {/* Back to Login */}
                        <div className="flex items-center">
                            <Link
                                href="/login"
                                className={`inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
                                    }`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to sign in
                            </Link>
                        </div>

                        {/* Header */}
                        <div className="text-center space-y-2">
                            <div className={`inline-flex items-center gap-2 p-4 rounded-full ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-100'} mb-4`}>
                                <Mail className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            </div>
                            <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {success ? 'Check your email' : 'Forgot your password?'}
                            </h2>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {success
                                    ? 'We sent a password reset link to your email address'
                                    : 'No worries, we\'ll send you reset instructions'
                                }
                            </p>
                        </div>

                        {/* Success State */}
                        {success ? (
                            <GlassCard padding="lg" className="space-y-6">
                                <div className="text-center space-y-4">
                                    <div className={`inline-flex items-center gap-2 p-4 rounded-full ${isDark ? 'bg-green-500/10' : 'bg-green-100'}`}>
                                        <CheckCircle className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Email sent successfully!
                                        </h3>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            We've sent a password reset link to <strong>{email}</strong>
                                        </p>
                                    </div>

                                    <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                                        <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                            <strong>Didn't receive the email?</strong><br />
                                            Check your spam folder or click the button below to resend
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <AnimatedButton
                                            onClick={() => setSuccess(false)}
                                            variant="primary"
                                            size="lg"
                                            icon={Send}
                                            gradient
                                            className="w-full"
                                        >
                                            Resend email
                                        </AnimatedButton>

                                        <AnimatedButton
                                            href="/login"
                                            variant="ghost"
                                            size="lg"
                                            icon={ArrowLeft}
                                            className="w-full"
                                        >
                                            Back to sign in
                                        </AnimatedButton>
                                    </div>
                                </div>
                            </GlassCard>
                        ) : (
                            <>
                                {/* Error Message */}
                                {error && (
                                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 animate-slideIn">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                            <p className="text-red-700 font-medium">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Reset Form */}
                                <GlassCard padding="lg" className="space-y-6">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <FormInput
                                            label="Email address"
                                            type="email"
                                            value={email}
                                            onChange={setEmail}
                                            placeholder="Enter your email address"
                                            required
                                            disabled={isLoading}
                                            validation={validateEmail}
                                        />

                                        <AnimatedButton
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            disabled={isLoading}
                                            loading={isLoading}
                                            icon={Send}
                                            gradient
                                            glow
                                            className="w-full"
                                        >
                                            {isLoading ? 'Sending...' : 'Send reset link'}
                                        </AnimatedButton>
                                    </form>

                                    {/* Help Text */}
                                    <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Remember your password?{' '}
                                            <Link
                                                href="/login"
                                                className={`font-medium hover:underline transition-colors duration-200 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'
                                                    }`}
                                            >
                                                Sign in here
                                            </Link>
                                        </p>
                                    </div>
                                </GlassCard>
                            </>
                        )}

                        {/* Security Note */}
                        <div className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <p>
                                For security reasons, we don't disclose whether an email is registered.<br />
                                If the email exists, you'll receive reset instructions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}