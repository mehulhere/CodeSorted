import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import { NotificationProvider, useNotification } from '../components/ui/notification';
import { setRateLimitErrorHandler, ApiErrorResponse } from '../lib/api';
import '../app/globals.css';
import { AuthProvider } from '@/lib/AuthContext';

function MyApp({ Component, pageProps }: AppProps) {
    const { showNotification } = useNotification();

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
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Component {...pageProps} />
            </main>
        </div>
    );
}

export default function App(props: AppProps) {
    return (
        <NotificationProvider>
            <AuthProvider>
                <MyApp {...props} />
            </AuthProvider>
        </NotificationProvider>
    );
} 