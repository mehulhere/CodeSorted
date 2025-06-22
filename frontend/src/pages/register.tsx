import Head from 'next/head';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowRight, Code, Users, Trophy, Zap } from 'lucide-react';
import '@/app/globals.css';
import { useTheme } from '@/providers/ThemeProvider';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import FormInput, { validateEmail, validateUsername, validateName } from '@/components/ui/FormInput';
import PasswordInput from '@/components/ui/PasswordInput';
import SocialLogin from '@/components/ui/SocialLogin';

interface RegisterResponse {
    message: string;
    insertedID: string;
    token: string;
}

interface ErrorResponse {
    message: string;
}

export default function Register() {
    const { isDark } = useTheme();
    const router = useRouter();

    const [firstname, setFirstname] = useState<string>('');
    const [lastname, setLastname] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        setSuccess(null);

        // Validation
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters long');
            setIsLoading(false);
            return;
        }

        if (!agreeToTerms) {
            setError('Please agree to the Terms of Service and Privacy Policy');
            setIsLoading(false);
            return;
        }

        const formData = {
            firstname,
            lastname,
            username,
            email,
            password,
        };

        try {
            setIsLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Registration failed.');
                return;
            }

            // Success animation before redirect
            setSuccess('Account created successfully! Welcome to CodeSorted!');

            setTimeout(() => {
                if (data.user?.isAdmin) {
                    router.push('/admin/problems/create');
                } else {
                    router.push('/');
                }
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            if (!success) {
                setIsLoading(false);
            }
        }
    };

    const handleSocialLogin = (provider: string) => {
        window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login/${provider}`;
    };

    return (
        <>
            <Head>
                <title>Create Account | CodeSorted - Join the Coding Community</title>
                <meta name="description" content="Join CodeSorted and start your competitive programming journey today!" />
            </Head>

            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse ${isDark ? 'bg-green-600' : 'bg-green-400'}`} />
                    <div className={`absolute top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-2000 ${isDark ? 'bg-blue-600' : 'bg-blue-400'}`} />
                    <div className={`absolute bottom-40 left-40 w-60 h-60 rounded-full blur-3xl opacity-15 animate-pulse animation-delay-4000 ${isDark ? 'bg-purple-600' : 'bg-purple-400'}`} />
                </div>

                <div className="relative z-10 min-h-screen flex">
                    {/* Left Side - Registration Form */}
                    <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
                        <div className="w-full max-w-md space-y-8">
                            {/* Header */}
                            <div className="text-center space-y-2">
                                <div className={`inline-flex items-center gap-2 p-4 rounded-full ${isDark ? 'bg-green-500/10' : 'bg-green-100'} mb-4`}>
                                    <UserPlus className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                </div>
                                <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Join CodeSorted
                                </h2>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Start your competitive programming journey today
                                </p>
                            </div>

                            {/* Success Message */}
                            {success && (
                                <div className="p-4 rounded-lg bg-green-50 border border-green-200 animate-slideIn">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <p className="text-green-700 font-medium">{success}</p>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 rounded-lg bg-red-50 border border-red-200 animate-slideIn">
                                    <p className="text-red-700 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Registration Form */}
                            <GlassCard padding="lg" className="space-y-6">
                                {/* Social Login First */}
                                <SocialLogin
                                    onSocialLogin={handleSocialLogin}
                                    disabled={isLoading}
                                />

                                {/* Divider */}
                                <div className="relative">
                                    <div className={`absolute inset-0 flex items-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                        <div className={`w-full border-t ${isDark ? 'border-gray-700' : 'border-gray-300'}`} />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className={`px-4 ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'}`}>
                                            Or create with email
                                        </span>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Name Fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormInput
                                            label="First Name"
                                            value={firstname}
                                            onChange={setFirstname}
                                            placeholder="John"
                                            required
                                            disabled={isLoading}
                                            validation={validateName}
                                        />
                                        <FormInput
                                            label="Last Name"
                                            value={lastname}
                                            onChange={setLastname}
                                            placeholder="Doe"
                                            required
                                            disabled={isLoading}
                                            validation={validateName}
                                        />
                                    </div>

                                    <FormInput
                                        label="Username"
                                        value={username}
                                        onChange={setUsername}
                                        placeholder="johndoe123"
                                        required
                                        disabled={isLoading}
                                        validation={validateUsername}
                                    />

                                    <FormInput
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={setEmail}
                                        placeholder="john@example.com"
                                        required
                                        disabled={isLoading}
                                        validation={validateEmail}
                                    />

                                    <PasswordInput
                                        value={password}
                                        onChange={setPassword}
                                        placeholder="Create a strong password"
                                        required
                                        disabled={isLoading}
                                        showStrengthIndicator
                                    />

                                    <PasswordInput
                                        value={confirmPassword}
                                        onChange={setConfirmPassword}
                                        placeholder="Confirm your password"
                                        required
                                        disabled={isLoading}
                                        confirmPassword={password}
                                    />

                                    {/* Terms Agreement */}
                                    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            checked={agreeToTerms}
                                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                                            className={`w-4 h-4 mt-0.5 rounded border-2 transition-colors duration-200 ${isDark
                                                ? 'border-gray-600 text-green-500 focus:ring-green-500 bg-gray-800'
                                                : 'border-gray-300 text-green-600 focus:ring-green-500 bg-white'
                                                }`}
                                            required
                                        />
                                        <label htmlFor="terms" className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            I agree to the{' '}
                                            <Link
                                                href="/terms"
                                                className={`font-medium hover:underline ${isDark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500'
                                                    }`}
                                            >
                                                Terms of Service
                                            </Link>
                                            {' '}and{' '}
                                            <Link
                                                href="/privacy"
                                                className={`font-medium hover:underline ${isDark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500'
                                                    }`}
                                            >
                                                Privacy Policy
                                            </Link>
                                        </label>
                                    </div>

                                    <AnimatedButton
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        disabled={isLoading}
                                        loading={isLoading}
                                        icon={ArrowRight}
                                        gradient
                                        glow
                                        className="w-full"
                                    >
                                        {isLoading ? 'Creating Account...' : 'Create Account'}
                                    </AnimatedButton>
                                </form>

                                {/* Sign In Link */}
                                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Already have an account?{' '}
                                        <Link
                                            href="/login"
                                            className={`font-medium hover:underline transition-colors duration-200 ${isDark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500'
                                                }`}
                                        >
                                            Sign in here →
                                        </Link>
                                    </p>
                                </div>
                            </GlassCard>
                        </div>
                    </div>

                    {/* Right Side - Community & Benefits */}
                    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                        <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-gray-900 via-green-900/20 to-blue-900/20' : 'bg-gradient-to-br from-green-600 via-blue-600 to-purple-600'}`} />

                        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
                            <div className="space-y-8">
                                {/* Title */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                                            <Users className="w-8 h-8" />
                                        </div>
                                        <h1 className="text-3xl font-bold">Join Our Community</h1>
                                    </div>
                                    <p className="text-xl text-white/90">
                                        Become part of a thriving community of competitive programmers
                                    </p>
                                </div>

                                {/* Benefits */}
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm mt-1">
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">AI Features</h3>
                                            <p className="text-white/80">Explore innovative AI tools and enhance your coding experience</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm mt-1">
                                            <Code className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Skill Development</h3>
                                            <p className="text-white/80">Master algorithms and data structures with guided practice</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm mt-1">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Peer Learning</h3>
                                            <p className="text-white/80">Connect with fellow programmers and share knowledge</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm mt-1">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Instant Feedback</h3>
                                            <p className="text-white/80">Get immediate results and detailed explanations</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Community Stats */}
                                <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/20">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold">50+</div>
                                        <div className="text-sm text-white/80">Active Coders</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold">1k+</div>
                                        <div className="text-sm text-white/80">Solutions Submitted</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold">99.9%</div>
                                        <div className="text-sm text-white/80">Uptime</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold">Free</div>
                                        <div className="text-sm text-white/80">Always</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating achievement badges */}
                        <div className="absolute top-20 left-20 opacity-30">
                            <div className="p-4 rounded-lg bg-black/20 backdrop-blur-sm animate-bounce animation-delay-1000">
                                <Trophy className="w-8 h-8 text-yellow-400" />
                            </div>
                        </div>

                        <div className="absolute bottom-32 left-16 opacity-20">
                            <div className="p-4 rounded-lg bg-black/20 backdrop-blur-sm animate-bounce animation-delay-3000">
                                <Users className="w-8 h-8 text-blue-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}