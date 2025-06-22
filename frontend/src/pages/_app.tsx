import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import { NotificationProvider, useNotification } from '../components/ui/notification';
import { setRateLimitErrorHandler, ApiErrorResponse } from '../lib/api';
import '../app/globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
    const { showNotification } = useNotification();
    const router = useRouter();

    const isProblemPage = router.pathname.startsWith('/problems/') && router.pathname !== '/problems';

    useEffect(() => {
        // Set up rate limit error handler
        setRateLimitErrorHandler((error: ApiErrorResponse) => {
            const resetTimeStr = error.resetTime ? new Date(error.resetTime).toLocaleTimeString() : 'sometime';
            const serviceName = error.service ? `${error.service} service` : 'service';
            showNotification({
                message: `Rate limit exceeded for ${serviceName}. Please try again ${resetTimeStr}.`,
                type: 'error',
                duration: 5000,
            });
        });
    }, [showNotification]);

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-300">
            <Navbar fullWidth={isProblemPage} />
            <main className="flex-grow">
                <Component {...pageProps} />
            </main>
        </div>
    );
}

export default function App(props: AppProps) {
    return (
        <ThemeProvider defaultTheme="dark" defaultCodeTheme="github">
            <NotificationProvider>
                <AuthProvider>
                    <MyApp {...props} />
                </AuthProvider>
            </NotificationProvider>
        </ThemeProvider>
    );
}