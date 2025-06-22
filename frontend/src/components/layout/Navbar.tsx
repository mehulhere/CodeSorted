import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { User, ChevronDown, LogOut, User as UserIcon, Code2, Trophy, Settings } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useTheme } from '@/providers/ThemeProvider';
import ThemeToggle from '@/components/ui/ThemeToggle';

const Navbar = () => {
    const router = useRouter();
    const { isLoggedIn, user, logout, loading } = useAuth();
    const { theme, isDark } = useTheme();

    const navigation = [
        { name: 'Home', href: '/', icon: null },
        { name: 'Problems', href: '/problems', icon: Code2 },
        ...(isLoggedIn ? [{ name: 'Submissions', href: '/submissions', icon: Trophy }] : []),
        ...(user?.isAdmin ? [{ name: 'Admin', href: '/admin/problems/create', icon: Settings }] : []),
    ];

    const isActivePage = (href: string) => {
        if (href === '/') {
            return router.pathname === '/';
        }
        return router.pathname.startsWith(href);
    };

    return (
        <header className={`
            sticky top-0 z-50 backdrop-blur-lg border-b transition-all duration-300
            ${isDark
                ? 'bg-gray-900/80 border-gray-800 shadow-lg shadow-gray-900/20'
                : 'bg-white/80 border-gray-200 shadow-lg shadow-gray-900/5'
            }
        `}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo Section */}
                    <div className="flex items-center">
                        <Link
                            href="/"
                            className={`
                                text-2xl font-bold transition-all duration-300
                                bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent
                                hover:from-blue-500 hover:to-purple-500
                                flex items-center gap-2
                            `}
                        >
                            <div className={`
                                p-2 rounded-lg transition-all duration-300
                                ${isDark ? 'bg-gray-800' : 'bg-blue-50'}
                                group-hover:scale-110
                            `}>
                                <Code2 className={`
                                    w-6 h-6 transition-colors duration-300
                                    ${isDark ? 'text-blue-400' : 'text-blue-600'}
                                `} />
                            </div>
                            CodeSorted
                        </Link>

                        {/* Navigation Links */}
                        <nav className="hidden md:flex ml-10 space-x-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = isActivePage(item.href);

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`
                                            px-4 py-2 rounded-lg font-medium transition-all duration-300
                                            flex items-center gap-2 group relative
                                            ${isActive
                                                ? isDark
                                                    ? 'bg-blue-900/50 text-blue-400 shadow-lg shadow-blue-900/30'
                                                    : 'bg-blue-100 text-blue-700 shadow-lg shadow-blue-500/20'
                                                : isDark
                                                    ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        {Icon && (
                                            <Icon className={`
                                                w-4 h-4 transition-transform duration-300
                                                ${isActive ? '' : 'group-hover:scale-110'}
                                            `} />
                                        )}
                                        {item.name}
                                        {isActive && (
                                            <div className={`
                                                absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 rounded-full
                                                ${isDark ? 'bg-blue-400' : 'bg-blue-600'}
                                            `} />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Right Side - User Menu & Theme Toggle */}
                    <div className="flex items-center space-x-4">
                        {/* Theme Toggle */}
                        <ThemeToggle showCodeThemes={true} />

                        {/* User Menu */}
                        {isLoggedIn && user ? (
                            <Menu as="div" className="relative">
                                <Menu.Button className={`
                                    flex items-center space-x-3 focus:outline-none p-2 rounded-lg
                                    transition-all duration-300 group
                                    ${isDark
                                        ? 'hover:bg-gray-800'
                                        : 'hover:bg-gray-100'
                                    }
                                `}>
                                    <div className={`
                                        h-8 w-8 rounded-full flex items-center justify-center
                                        transition-all duration-300 group-hover:scale-110
                                        ${isDark
                                            ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                                            : 'bg-gradient-to-br from-blue-400 to-purple-500'
                                        }
                                    `}>
                                        <UserIcon className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <span className={`
                                            text-sm font-medium block
                                            ${isDark ? 'text-gray-200' : 'text-gray-700'}
                                        `}>
                                            {user.username}
                                        </span>
                                        <span className={`
                                            text-xs block
                                            ${isDark ? 'text-gray-400' : 'text-gray-500'}
                                        `}>
                                            {user.isAdmin ? 'Admin' : 'Student'}
                                        </span>
                                    </div>
                                    <ChevronDown className={`
                                        h-4 w-4 transition-transform duration-300 group-hover:rotate-180
                                        ${isDark ? 'text-gray-400' : 'text-gray-500'}
                                    `} />
                                </Menu.Button>

                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-200"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-150"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className={`
                                        absolute right-0 mt-2 w-56 origin-top-right rounded-lg shadow-xl
                                        ring-1 ring-black ring-opacity-5 focus:outline-none z-50
                                        ${isDark
                                            ? 'bg-gray-800 border border-gray-700'
                                            : 'bg-white border border-gray-200'
                                        }
                                        backdrop-blur-lg
                                    `}>
                                        <div className="p-2">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        href={`/profile/${user.username}`}
                                                        className={`
                                                            flex items-center w-full px-4 py-3 text-sm rounded-lg
                                                            transition-all duration-200
                                                            ${active
                                                                ? isDark
                                                                    ? 'bg-blue-900/50 text-blue-400'
                                                                    : 'bg-blue-50 text-blue-700'
                                                                : isDark
                                                                    ? 'text-gray-300 hover:text-white'
                                                                    : 'text-gray-700 hover:text-gray-900'
                                                            }
                                                        `}
                                                    >
                                                        <UserIcon className="mr-3 h-5 w-5" />
                                                        View Profile
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <div className={`
                                                my-2 h-px
                                                ${isDark ? 'bg-gray-700' : 'bg-gray-200'}
                                            `} />
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={logout}
                                                        className={`
                                                            flex items-center w-full px-4 py-3 text-sm rounded-lg
                                                            transition-all duration-200
                                                            ${active
                                                                ? 'bg-red-900/50 text-red-400'
                                                                : 'text-red-500 hover:text-red-600'
                                                            }
                                                        `}
                                                    >
                                                        <LogOut className="mr-3 h-5 w-5" />
                                                        Sign out
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/login"
                                    className={`
                                        px-4 py-2 font-medium rounded-lg transition-all duration-300
                                        ${isDark
                                            ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'
                                            : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                        }
                                    `}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    className={`
                                        px-4 py-2 font-semibold rounded-lg transition-all duration-300
                                        bg-gradient-to-r from-blue-600 to-purple-600 text-white
                                        hover:from-blue-500 hover:to-purple-500
                                        hover:scale-105 hover:shadow-lg
                                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                    `}
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
