import Head from 'next/head';
import { useState, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link'; // For a link to the registration page
import { useRouter } from 'next/router'; // Uncomment to redirect after login
import '@/app/globals.css';
import { guestLogin } from '@/lib/api'; // Import the guest login function

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
    const [usernameOrEmail, setUsernameOrEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isGuestLoading, setIsGuestLoading] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const router = useRouter(); // Uncomment to redirect after login

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
                credentials: 'include', // Important to handle the HttpOnly cookie
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Login failed. Please check your credentials.');
                setIsLoading(false);
                return;
            }

            // Redirect based on admin status from the response
            if (data.user?.isAdmin) {
                router.push('/admin/problems/create');
            } else {
                router.push('/');
            }

        } catch (err: any) {
            console.error('Login request failed:', err);
            setError(err instanceof Error ? err.message : 'An unknown network or parsing error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setError(null);
        setIsGuestLoading(true);
        setSuccessMessage(null);

        try {
            const response = await guestLogin();

            // Guest login successful
            router.push('/'); // Redirect to home page
        } catch (err: any) {
            console.error('Guest login failed:', err);
            if (err.status === 429) {
                // Rate limit exceeded
                setError(`Rate limit exceeded for guest account creation. Please try again later. Reset time: ${err.resetTime}`);
            } else {
                setError(err.message || 'Failed to create guest account. Please try again later.');
            }
        } finally {
            setIsGuestLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login/${provider}`;
    };

    return (
        <>
            <Head>
                <title>Login - Online Judge</title>
            </Head>
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sign in to your account
                    </h1>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        {error && (
                            <p className="mb-4 rounded-md bg-red-50 p-4 text-sm font-medium text-red-700 text-center">
                                {error}
                            </p>
                        )}
                        {successMessage && (
                            <p className="mb-4 rounded-md bg-green-50 p-4 text-sm font-medium text-green-700 text-center">
                                {successMessage}
                            </p>
                        )}
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Username or Email
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="text"
                                        autoComplete="username email"
                                        required
                                        value={usernameOrEmail}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setUsernameOrEmail(e.target.value)}
                                        disabled={isLoading}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Signing in...' : 'Sign in'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            {/* Social Login Buttons */}
                            <div className="mt-6 grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => handleSocialLogin('google')}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                >
                                    <span className="sr-only">Sign in with Google</span>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => handleSocialLogin('facebook')}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                >
                                    <span className="sr-only">Sign in with Facebook</span>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => handleSocialLogin('github')}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                >
                                    <span className="sr-only">Sign in with GitHub</span>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            {/* Guest login button */}
                            <div className="mt-4">
                                <button
                                    onClick={handleGuestLogin}
                                    disabled={isGuestLoading}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                >
                                    {isGuestLoading ? 'Creating guest account...' : 'Continue as Guest'}
                                </button>
                                <p className="mt-1 text-xs text-gray-500 text-center">
                                    Limited to 3 guest accounts per hour per IP address
                                </p>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-600">
                                    Don't have an account?{' '}
                                    <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                                        Sign up
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 