import Head from 'next/head';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LogIn, ArrowRight, Code, Shield, Sparkles } from 'lucide-react';
import '@/app/globals.css';
import { useTheme } from '@/providers/ThemeProvider';
import { guestLogin } from '@/lib/api';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import FormInput, { validateEmail } from '@/components/ui/FormInput';
import SocialLogin from '@/components/ui/SocialLogin';

// Assumed response structures from your backend
interface LoginSuccessResponse {
    message: string;
    token: string;
    user: {
        user_id: string;
        username: string;
        email: string;
        firstname: string;
        lastname: string;
        isAdmin: boolean;
    };
}

interface ErrorResponse {
    message: string; // Assuming backend sends errors in this format
}

export default function LoginPage() {
    const { isDark } = useTheme();
    const router = useRouter();

    const [usernameOrEmail, setUsernameOrEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isGuestLoading, setIsGuestLoading] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        setSuccessMessage(null);

        if (!usernameOrEmail || !password) {
            setError('Username/Email and password are required.');
            setIsLoading(false);
            return;
        }

        const loginData = {
            email: usernameOrEmail,
            password,
        };

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Login failed. Please check your credentials.');
                setIsLoading(false);
                return;
            }

            // Success animation before redirect
            setSuccessMessage('Welcome back! Redirecting...');

            setTimeout(() => {
                if (data.user?.isAdmin) {
                    router.push('/admin/problems/create');
                } else {
                    router.push('/');
                }
            }, 1500);

        } catch (err: any) {
            console.error('Login request failed:', err);
            setError(err instanceof Error ? err.message : 'An unknown network or parsing error occurred.');
        } finally {
            if (!successMessage) {
                setIsLoading(false);
            }
        }
    };

    const handleGuestLogin = async () => {
        setError(null);
        setIsGuestLoading(true);
        setSuccessMessage(null);

        try {
            await guestLogin();
            setSuccessMessage('Guest account created! Welcome to CodeSorted!');

            setTimeout(() => {
                router.push('/');
            }, 1500);
        } catch (err: any) {
            console.error('Guest login failed:', err);
            if (err.status === 429) {
                setError(`Rate limit exceeded for guest account creation. Please try again later. Reset time: ${err.resetTime}`);
            } else {
                setError(err.message || 'Failed to create guest account. Please try again later.');
            }
        } finally {
            if (!successMessage) {
                setIsGuestLoading(false);
            }
        }
    };

    const handleSocialLogin = (provider: string) => {
        window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login/${provider}`;
    };

    return (
        <>
            <Head>
                <title>Sign In | CodeSorted - Competitive Programming Platform</title>
                <meta name="description" content="Sign in to CodeSorted - Your gateway to competitive programming excellence" />
            </Head>

            <div className="page-background">
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10 animate-pulse ${isDark ? 'bg-blue-600' : 'bg-blue-400'}`} />
                    <div className={`absolute top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10 animate-pulse animation-delay-2000 ${isDark ? 'bg-purple-600' : 'bg-purple-400'}`} />
                    <div className={`absolute bottom-40 right-40 w-60 h-60 rounded-full blur-3xl opacity-10 animate-pulse animation-delay-4000 ${isDark ? 'bg-pink-600' : 'bg-pink-400'}`} />
                </div>

                <div className="relative z-10 min-h-screen flex">
                    {/* Left Side - Branding & Features */}
                    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                        <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20' : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'}`} />

                        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
                            <div className="space-y-8">
                                {/* Logo & Title */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                                            <Code className="w-8 h-8" />
                                        </div>
                                        <h1 className="text-3xl font-bold">CodeSorted</h1>
                                    </div>
                                    <p className="text-xl text-white/90">
                                        Your journey to competitive programming excellence starts here
                                    </p>
                                </div>

                                {/* Features */}
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm mt-1">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Secure & Reliable</h3>
                                            <p className="text-white/80">Enterprise-grade security with fast, reliable code execution</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm mt-1">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">AI-Powered Learning</h3>
                                            <p className="text-white/80">Get personalized hints and learn from detailed explanations</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm mt-1">
                                            <Code className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Multi-Language Support</h3>
                                            <p className="text-white/80">Code in Python, JavaScript, Java, C++, and more</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">100+</div>
                                        <div className="text-sm text-white/80">Problems</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">1</div>
                                        <div className="text-sm text-white/80">Developer</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">99.9%</div>
                                        <div className="text-sm text-white/80">Uptime</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating code snippets */}
                        <div className="absolute top-20 right-20 opacity-30">
                            <div className="p-4 rounded-lg bg-black/20 backdrop-blur-sm font-mono text-sm animate-bounce animation-delay-1000">
                                <div className="text-blue-300">def</div>
                                <div className="text-yellow-300 ml-2">solve():</div>
                                <div className="text-green-300 ml-4">return "Hello!"</div>
                            </div>
                        </div>

                        <div className="absolute bottom-32 right-16 opacity-20">
                            <div className="p-4 rounded-lg bg-black/20 backdrop-blur-sm font-mono text-sm animate-bounce animation-delay-3000">
                                <div className="text-purple-300">{"// Success!"}</div>
                                <div className="text-green-300">console.log("AC");</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
                        <div className="w-full max-w-md space-y-8">
                            {/* Header */}
                            <div className="text-center space-y-2">
                                <div className={`inline-flex items-center gap-2 p-4 rounded-full ${isDark ? 'bg-blue-500/10' : 'bg-blue-100'} mb-4`}>
                                    <LogIn className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                </div>
                                <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Welcome back!
                                </h2>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Sign in to continue your coding journey
                                </p>
                            </div>

                            {/* Success Message */}
                            {successMessage && (
                                <div className="p-4 rounded-lg bg-green-50 border border-green-200 animate-slideIn">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <p className="text-green-700 font-medium">{successMessage}</p>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 rounded-lg bg-red-50 border border-red-200 animate-slideIn">
                                    <p className="text-red-700 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Login Form */}
                            <GlassCard padding="lg" className="space-y-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <FormInput
                                        label="Username or Email"
                                        type="text"
                                        value={usernameOrEmail}
                                        onChange={setUsernameOrEmail}
                                        placeholder="Enter your username or email"
                                        required
                                        disabled={isLoading || isGuestLoading}
                                    />

                                    <FormInput
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={setPassword}
                                        placeholder="Enter your password"
                                        required
                                        disabled={isLoading || isGuestLoading}
                                    />

                                    <div className="flex items-center justify-between text-sm">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                className={`w-4 h-4 rounded border-2 transition-colors duration-200 ${isDark
                                                    ? 'border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800'
                                                    : 'border-gray-300 text-blue-600 focus:ring-blue-500 bg-white'
                                                    }`}
                                            />
                                            <span className={`ml-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Remember me
                                            </span>
                                        </label>
                                        <Link
                                            href="/forgot-password"
                                            className={`font-medium hover:underline transition-colors duration-200 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                                                }`}
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>

                                    <AnimatedButton
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        disabled={isLoading || isGuestLoading}
                                        loading={isLoading}
                                        icon={ArrowRight}
                                        gradient
                                        glow
                                        className="w-full"
                                    >
                                        {isLoading ? 'Signing in...' : 'Sign In'}
                                    </AnimatedButton>
                                </form>

                                {/* Social Login */}
                                <SocialLogin
                                    onSocialLogin={handleSocialLogin}
                                    onGuestLogin={handleGuestLogin}
                                    isGuestLoading={isGuestLoading}
                                    disabled={isLoading}
                                />

                                {/* Sign Up Link */}
                                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Don't have an account?{' '}
                                        <Link
                                            href="/register"
                                            className={`font-medium hover:underline transition-colors duration-200 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                                                }`}
                                        >
                                            Create one now →
                                        </Link>
                                    </p>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}