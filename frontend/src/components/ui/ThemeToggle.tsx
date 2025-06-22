'use client';

import React, { useState } from 'react';
import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import { useTheme, ThemeMode, CodeTheme } from '@/providers/ThemeProvider';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface ThemeToggleProps {
    showCodeThemes?: boolean;
    className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
    showCodeThemes = false,
    className = ''
}) => {
    const {
        theme,
        themeMode,
        codeTheme,
        setThemeMode,
        setCodeTheme,
        toggleTheme,
        isDark
    } = useTheme();

    const [isOpen, setIsOpen] = useState(false);

    const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
        { mode: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
        { mode: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
        { mode: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
    ];

    const codeThemeOptions: { theme: CodeTheme; label: string; preview: string }[] = [
        { theme: 'github', label: 'GitHub', preview: 'bg-gray-50 text-gray-900' },
        { theme: 'monokai', label: 'Monokai', preview: 'bg-gray-900 text-green-400' },
        { theme: 'dracula', label: 'Dracula', preview: 'bg-purple-900 text-pink-300' },
        { theme: 'one-dark', label: 'One Dark', preview: 'bg-gray-800 text-blue-300' },
        { theme: 'tokyo-night', label: 'Tokyo Night', preview: 'bg-indigo-900 text-cyan-300' },
        { theme: 'nord', label: 'Nord', preview: 'bg-blue-900 text-blue-100' },
    ];

    const getCurrentThemeIcon = () => {
        const option = themeOptions.find(opt => opt.mode === themeMode);
        return option?.icon || <Monitor className="w-4 h-4" />;
    };

    return (
        <div className={`relative ${className}`}>
            <Menu as="div" className="relative">
                <Menu.Button
                    className={`
            flex items-center justify-center p-2 rounded-lg
            transition-all duration-300 ease-in-out
            ${isDark
                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                        }
            hover:scale-105 hover:shadow-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            group
          `}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="transition-transform duration-300 group-hover:rotate-12">
                        {getCurrentThemeIcon()}
                    </div>
                </Menu.Button>

                <Transition
                    as={Fragment}
                    show={isOpen}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-150"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items
                        className={`
              absolute right-0 mt-2 w-64 origin-top-right rounded-lg shadow-xl
              ring-1 ring-black ring-opacity-5 focus:outline-none z-50
              ${isDark
                                ? 'bg-gray-800 border border-gray-700'
                                : 'bg-white border border-gray-200'
                            }
              backdrop-blur-lg
            `}
                    >
                        <div className="p-4 space-y-4">
                            {/* Theme Mode Section */}
                            <div>
                                <div className={`
                  text-sm font-semibold mb-2 flex items-center gap-2
                  ${isDark ? 'text-gray-200' : 'text-gray-700'}
                `}>
                                    <Palette className="w-4 h-4" />
                                    Theme Mode
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {themeOptions.map((option) => (
                                        <Menu.Item key={option.mode}>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => {
                                                        setThemeMode(option.mode);
                                                        setIsOpen(false);
                                                    }}
                                                    className={`
                            flex flex-col items-center p-2 rounded-lg text-xs
                            transition-all duration-200
                            ${themeMode === option.mode
                                                            ? isDark
                                                                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                                                : 'bg-blue-100 text-blue-900 ring-2 ring-blue-500'
                                                            : active
                                                                ? isDark
                                                                    ? 'bg-gray-700 text-gray-200'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                : isDark
                                                                    ? 'text-gray-400 hover:text-gray-200'
                                                                    : 'text-gray-600 hover:text-gray-900'
                                                        }
                          `}
                                                >
                                                    <div className="mb-1">
                                                        {option.icon}
                                                    </div>
                                                    <span>{option.label}</span>
                                                    {themeMode === option.mode && (
                                                        <Check className="w-3 h-3 mt-1" />
                                                    )}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>
                            </div>

                            {/* Code Theme Section (if enabled) */}
                            {showCodeThemes && (
                                <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <div className={`
                    text-sm font-semibold mb-2
                    ${isDark ? 'text-gray-200' : 'text-gray-700'}
                  `}>
                                        Code Theme
                                    </div>
                                    <div className="space-y-1">
                                        {codeThemeOptions.map((option) => (
                                            <Menu.Item key={option.theme}>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => {
                                                            setCodeTheme(option.theme);
                                                            setIsOpen(false);
                                                        }}
                                                        className={`
                              w-full flex items-center justify-between p-2 rounded-lg text-sm
                              transition-all duration-200
                              ${codeTheme === option.theme
                                                                ? isDark
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-blue-100 text-blue-900'
                                                                : active
                                                                    ? isDark
                                                                        ? 'bg-gray-700 text-gray-200'
                                                                        : 'bg-gray-100 text-gray-700'
                                                                    : isDark
                                                                        ? 'text-gray-400 hover:text-gray-200'
                                                                        : 'text-gray-600 hover:text-gray-900'
                                                            }
                            `}
                                                    >
                                                        <span>{option.label}</span>
                                                        <div className={`
                              w-8 h-4 rounded text-xs flex items-center justify-center
                              ${option.preview}
                            `}>
                                                            {'{}'}
                                                        </div>
                                                        {codeTheme === option.theme && (
                                                            <Check className="w-4 h-4 ml-2" />
                                                        )}
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    );
};

export default ThemeToggle;