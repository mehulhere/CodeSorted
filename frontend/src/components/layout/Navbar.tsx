import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { User, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useAuth } from '@/lib/useAuth';

const Navbar = () => {
    const router = useRouter();
    const { isLoggedIn, user, logout, loading } = useAuth();

    return (
        <header className="bg-white shadow-md">
            <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="text-2xl font-bold text-indigo-600">
                        for i in range ()
                    </Link>
                    <nav className="ml-10 flex space-x-8">
                        <Link href="/" className="text-gray-500 hover:text-indigo-600 font-medium">
                            Home
                        </Link>
                        <Link href="/problems" className="text-gray-500 hover:text-indigo-600 font-medium">
                            Problems
                        </Link>
                        {isLoggedIn && (
                            <Link href="/submissions" className="text-gray-500 hover:text-indigo-600 font-medium">
                                Submissions
                            </Link>
                        )}
                        {user?.isAdmin && (
                            <Link href="/admin/problems/create" className="text-gray-500 hover:text-indigo-600 font-medium">
                                Add Problem
                            </Link>
                        )}
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    {isLoggedIn && user ? (
                        <>
                            <Menu as="div" className="relative">
                                <Menu.Button className="flex items-center space-x-1 focus:outline-none">
                                    <div className="flex items-center space-x-2">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                            <UserIcon className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{user.username}</span>
                                        <ChevronDown className="h-4 w-4 text-gray-500" />
                                    </div>
                                </Menu.Button>
                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                        <div className="px-1 py-1">
                                            <Menu.Item>
                                                {({ active }: { active: boolean }) => (
                                                    <Link
                                                        href={`/profile/${user.username}`}
                                                        className={`${active ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                                                            } group flex w-full items-center rounded-md px-4 py-2 text-sm`}
                                                    >
                                                        <UserIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                        Your Profile
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }: { active: boolean }) => (
                                                    <button
                                                        onClick={logout}
                                                        className={`${active ? 'bg-red-50 text-red-900' : 'text-red-700'
                                                            } group flex w-full items-center rounded-md px-4 py-2 text-sm`}
                                                    >
                                                        <LogOut className="mr-3 h-5 w-5 text-red-400" />
                                                        Sign out
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
                                Sign In
                            </Link>
                            <Link href="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
