'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define comprehensive theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type CodeTheme = 'github' | 'monokai' | 'dracula' | 'one-dark' | 'tokyo-night' | 'nord';

export interface ThemeColors {
    // Primary colors
    primary: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
    };
    // Background colors
    background: {
        primary: string;
        secondary: string;
        tertiary: string;
        accent: string;
        glass: string;
    };
    // Text colors
    text: {
        primary: string;
        secondary: string;
        tertiary: string;
        accent: string;
        inverse: string;
    };
    // Border colors
    border: {
        primary: string;
        secondary: string;
        accent: string;
        hover: string;
    };
    // Status colors
    status: {
        success: string;
        warning: string;
        error: string;
        info: string;
        pending: string;
    };
    // Code editor colors
    code: {
        background: string;
        foreground: string;
        comment: string;
        keyword: string;
        string: string;
        number: string;
        function: string;
        variable: string;
    };
}

export interface Theme {
    name: string;
    mode: 'light' | 'dark';
    colors: ThemeColors;
    shadows: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
        glow: string;
        inner: string;
    };
    gradients: {
        primary: string;
        secondary: string;
        accent: string;
        rainbow: string;
    };
}

// Light theme configuration
const lightTheme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
        primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
            950: '#082f49',
        },
        background: {
            primary: '#ffffff',
            secondary: '#f8fafc',
            tertiary: '#f1f5f9',
            accent: '#e2e8f0',
            glass: 'rgba(255, 255, 255, 0.7)',
        },
        text: {
            primary: '#0f172a',
            secondary: '#334155',
            tertiary: '#64748b',
            accent: '#0ea5e9',
            inverse: '#ffffff',
        },
        border: {
            primary: '#e2e8f0',
            secondary: '#cbd5e1',
            accent: '#0ea5e9',
            hover: '#94a3b8',
        },
        status: {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
            pending: '#f97316',
        },
        code: {
            background: '#f8fafc',
            foreground: '#0f172a',
            comment: '#64748b',
            keyword: '#7c3aed',
            string: '#059669',
            number: '#dc2626',
            function: '#0369a1',
            variable: '#0f172a',
        },
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        glow: '0 0 20px rgb(14 165 233 / 0.3)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    },
    gradients: {
        primary: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
        secondary: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
        accent: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        rainbow: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 25%, #8b5cf6 50%, #3b82f6 75%, #10b981 100%)',
    },
};

// Dark theme configuration
const darkTheme: Theme = {
    name: 'dark',
    mode: 'dark',
    colors: {
        primary: {
            50: '#0c1621',
            100: '#111827',
            200: '#1f2937',
            300: '#374151',
            400: '#4b5563',
            500: '#6b7280',
            600: '#9ca3af',
            700: '#d1d5db',
            800: '#e5e7eb',
            900: '#f3f4f6',
            950: '#f9fafb',
        },
        background: {
            primary: '#0a0e1a',
            secondary: '#111827',
            tertiary: '#1f2937',
            accent: '#374151',
            glass: 'rgba(17, 24, 39, 0.7)',
        },
        text: {
            primary: '#f9fafb',
            secondary: '#e5e7eb',
            tertiary: '#9ca3af',
            accent: '#60a5fa',
            inverse: '#0f172a',
        },
        border: {
            primary: '#374151',
            secondary: '#4b5563',
            accent: '#60a5fa',
            hover: '#6b7280',
        },
        status: {
            success: '#34d399',
            warning: '#fbbf24',
            error: '#f87171',
            info: '#60a5fa',
            pending: '#fb923c',
        },
        code: {
            background: '#0d1117',
            foreground: '#f0f6fc',
            comment: '#7d8590',
            keyword: '#ff7b72',
            string: '#a5d6ff',
            number: '#79c0ff',
            function: '#d2a8ff',
            variable: '#ffa657',
        },
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
        glow: '0 0 20px rgb(96 165 250 / 0.4)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.2)',
    },
    gradients: {
        primary: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
        secondary: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
        accent: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        rainbow: 'linear-gradient(135deg, #fbbf24 0%, #f87171 25%, #a78bfa 50%, #60a5fa 75%, #34d399 100%)',
    },
};

interface ThemeContextType {
    theme: Theme;
    themeMode: ThemeMode;
    codeTheme: CodeTheme;
    setThemeMode: (mode: ThemeMode) => void;
    setCodeTheme: (theme: CodeTheme) => void;
    toggleTheme: () => void;
    isDark: boolean;
    isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: ThemeMode;
    defaultCodeTheme?: CodeTheme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = 'system',
    defaultCodeTheme = 'github',
}) => {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(defaultTheme);
    const [codeTheme, setCodeThemeState] = useState<CodeTheme>(defaultCodeTheme);
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    // Detect system theme preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

            const handleChange = (e: MediaQueryListEvent) => {
                setSystemTheme(e.matches ? 'dark' : 'light');
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, []);

    // Load saved preferences from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme-mode') as ThemeMode;
            const savedCodeTheme = localStorage.getItem('code-theme') as CodeTheme;

            if (savedTheme) setThemeModeState(savedTheme);
            if (savedCodeTheme) setCodeThemeState(savedCodeTheme);
        }
    }, []);

    // Apply theme to document
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const activeTheme = themeMode === 'system' ? systemTheme : themeMode;
            document.documentElement.setAttribute('data-theme', activeTheme);
            document.documentElement.classList.toggle('dark', activeTheme === 'dark');
        }
    }, [themeMode, systemTheme]);

    const setThemeMode = (mode: ThemeMode) => {
        setThemeModeState(mode);
        localStorage.setItem('theme-mode', mode);
    };

    const setCodeTheme = (theme: CodeTheme) => {
        setCodeThemeState(theme);
        localStorage.setItem('code-theme', theme);
    };

    const toggleTheme = () => {
        const currentTheme = themeMode === 'system' ? systemTheme : themeMode;
        setThemeMode(currentTheme === 'light' ? 'dark' : 'light');
    };

    const activeTheme = themeMode === 'system' ? systemTheme : themeMode;
    const theme = activeTheme === 'dark' ? darkTheme : lightTheme;

    const value: ThemeContextType = {
        theme,
        themeMode,
        codeTheme,
        setThemeMode,
        setCodeTheme,
        toggleTheme,
        isDark: activeTheme === 'dark',
        isLight: activeTheme === 'light',
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Utility function to get CSS variables for the current theme
export const getCSSVariables = (theme: Theme): Record<string, string> => {
    const variables: Record<string, string> = {};

    // Add color variables
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
        variables[`--color-primary-${key}`] = value;
    });

    Object.entries(theme.colors.background).forEach(([key, value]) => {
        variables[`--color-bg-${key}`] = value;
    });

    Object.entries(theme.colors.text).forEach(([key, value]) => {
        variables[`--color-text-${key}`] = value;
    });

    Object.entries(theme.colors.border).forEach(([key, value]) => {
        variables[`--color-border-${key}`] = value;
    });

    Object.entries(theme.colors.status).forEach(([key, value]) => {
        variables[`--color-status-${key}`] = value;
    });

    // Add shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
        variables[`--shadow-${key}`] = value;
    });

    // Add gradient variables
    Object.entries(theme.gradients).forEach(([key, value]) => {
        variables[`--gradient-${key}`] = value;
    });

    return variables;
};