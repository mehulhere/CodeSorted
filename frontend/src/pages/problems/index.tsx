import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import type { ProblemListItemType, ApiError } from '@/types/problem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import '@/app/globals.css';

// Add acceptance rate to the problem list item type
interface EnhancedProblemListItemType extends ProblemListItemType {
    acceptance_rate?: number;
}

// Type for available sort options
type SortOption = 'id' | 'title' | 'difficulty' | 'acceptance_rate';

// Type for difficulty filter options
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

export default function ProblemsPage() {
    // State for data
    const [problems, setProblems] = useState<EnhancedProblemListItemType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for filtering and sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
    const [skillFilter, setSkillFilter] = useState('all');
    const [sortBy, setSortBy] = useState<SortOption>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [showFilters, setShowFilters] = useState(false);

    // Get unique skills/tags from all problems
    const availableSkills = useMemo(() => {
        const skillSet = new Set<string>();
        problems.forEach(problem => {
            if (problem.tags) {
                problem.tags.forEach(tag => skillSet.add(tag));
            }
        });
        return Array.from(skillSet).sort();
    }, [problems]);

    useEffect(() => {
        const fetchProblems = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('http://localhost:8080/problems');
                if (!response.ok) {
                    const errorData: ApiError = await response.json();
                    throw new Error(errorData.message || `Failed to fetch problems: ${response.status}`);
                }
                const data: EnhancedProblemListItemType[] = await response.json();
                setProblems(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                console.error("Fetch problems error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProblems();
    }, []);

    // Apply filters and sorting
    const filteredAndSortedProblems = useMemo(() => {
        let result = [...problems];

        // Apply search filter
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(problem =>
                problem.title.toLowerCase().includes(lowerSearchTerm) ||
                problem.problem_id.toLowerCase().includes(lowerSearchTerm) ||
                (problem.tags && problem.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
            );
        }

        // Apply difficulty filter
        if (difficultyFilter !== 'all') {
            result = result.filter(problem =>
                problem.difficulty.toLowerCase() === difficultyFilter
            );
        }

        // Apply skill/tag filter
        if (skillFilter !== 'all') {
            result = result.filter(problem =>
                problem.tags && problem.tags.includes(skillFilter)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;

            // Sort based on selected criterion
            switch (sortBy) {
                case 'id':
                    comparison = a.problem_id.localeCompare(b.problem_id);
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'difficulty':
                    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
                    const diffA = difficultyOrder[a.difficulty.toLowerCase() as keyof typeof difficultyOrder] || 0;
                    const diffB = difficultyOrder[b.difficulty.toLowerCase() as keyof typeof difficultyOrder] || 0;
                    comparison = diffA - diffB;
                    break;
                case 'acceptance_rate':
                    const rateA = a.acceptance_rate || 0;
                    const rateB = b.acceptance_rate || 0;
                    comparison = rateA - rateB;
                    break;
                default:
                    comparison = 0;
            }

            // Apply sort direction
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [problems, searchTerm, difficultyFilter, skillFilter, sortBy, sortDirection]);

    const handleSort = (option: SortOption) => {
        if (sortBy === option) {
            // Toggle direction if clicking the same option
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new sort option and reset direction to ascending
            setSortBy(option);
            setSortDirection('asc');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDifficultyFilter('all');
        setSkillFilter('all');
    };

    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy':
                return 'bg-green-100 text-green-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'hard':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex justify-center items-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em]"></div>
                    <p className="mt-4 text-xl text-gray-700">Loading problems...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                <p className="text-xl text-red-600 bg-red-100 p-4 rounded-md">Error: {error}</p>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Problems - Online Judge</title>
            </Head>
            <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-6">
                        Problem Set
                    </h1>

                    {/* Search and Filters */}
                    <div className="mb-6 bg-white shadow rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                            {/* Search input */}
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <Input
                                    placeholder="Search problems by title, ID, or tag..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filter toggle button */}
                            <Button
                                variant="outline"
                                className="flex items-center"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <SlidersHorizontal className="h-4 w-4 mr-2" />
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </Button>
                        </div>

                        {/* Expanded filters */}
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                {/* Difficulty filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                                    <Select
                                        value={difficultyFilter}
                                        onValueChange={(value) => setDifficultyFilter(value as DifficultyFilter)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by difficulty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Difficulties</SelectItem>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Skill/Tag filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm/Skill</label>
                                    <Select
                                        value={skillFilter}
                                        onValueChange={setSkillFilter}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by skill" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Skills</SelectItem>
                                            {availableSkills.map((skill) => (
                                                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sort by */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                                    <Select
                                        value={sortBy}
                                        onValueChange={(value) => handleSort(value as SortOption)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="id">Problem ID</SelectItem>
                                            <SelectItem value="title">Title</SelectItem>
                                            <SelectItem value="difficulty">Difficulty</SelectItem>
                                            <SelectItem value="acceptance_rate">Acceptance Rate</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center mt-2">
                                        <span className="text-xs text-gray-500 mr-2">Order:</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                                            className="h-6 px-2"
                                        >
                                            <ArrowUpDown className="h-3 w-3 mr-1" />
                                            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filter indicators and clear button */}
                        {(searchTerm || difficultyFilter !== 'all' || skillFilter !== 'all') && (
                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-200">
                                <span className="text-sm text-gray-600">Active filters:</span>

                                {searchTerm && (
                                    <Badge variant="secondary" className="gap-1 pl-2">
                                        Search: {searchTerm}
                                        <button onClick={() => setSearchTerm('')} className="ml-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}

                                {difficultyFilter !== 'all' && (
                                    <Badge variant="secondary" className="gap-1 pl-2">
                                        Difficulty: {difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1)}
                                        <button onClick={() => setDifficultyFilter('all')} className="ml-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}

                                {skillFilter !== 'all' && (
                                    <Badge variant="secondary" className="gap-1 pl-2">
                                        Skill: {skillFilter}
                                        <button onClick={() => setSkillFilter('all')} className="ml-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="ml-auto text-xs"
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Problem list count */}
                    <div className="mb-4 text-gray-600">
                        Showing {filteredAndSortedProblems.length} of {problems.length} problems
                    </div>

                    {filteredAndSortedProblems.length === 0 && (
                        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
                            <p className="text-gray-600 text-lg">No problems match your filters. Try adjusting your search criteria.</p>
                        </div>
                    )}

                    {filteredAndSortedProblems.length > 0 && (
                        <div className="bg-white shadow overflow-hidden sm:rounded-md">
                            {/* Table header */}
                            <div className="hidden md:grid md:grid-cols-12 px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-500">
                                <div className="md:col-span-1">#</div>
                                <div className="md:col-span-5">Title</div>
                                <div className="md:col-span-2">Difficulty</div>
                                <div className="md:col-span-2">Acceptance</div>
                                <div className="md:col-span-2">Tags</div>
                            </div>

                            {/* Problem list */}
                            <ul role="list" className="divide-y divide-gray-200">
                                {filteredAndSortedProblems.map((problem) => (
                                    <li key={problem.id}>
                                        <Link href={`/problems/${problem.problem_id || problem.id}`} legacyBehavior>
                                            <a className="block hover:bg-gray-50">
                                                <div className="px-4 py-4 sm:px-6">
                                                    {/* Mobile view */}
                                                    <div className="md:hidden">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-lg font-medium text-indigo-600 truncate">
                                                                {problem.problem_id ? `${problem.problem_id}. ` : ''}{problem.title}
                                                            </p>
                                                            <div className="ml-2 flex-shrink-0 flex">
                                                                <p
                                                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyClass(
                                                                        problem.difficulty
                                                                    )}`}
                                                                >
                                                                    {problem.difficulty || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 flex justify-between">
                                                            <div className="flex items-center text-sm text-gray-500">
                                                                {problem.acceptance_rate !== undefined && (
                                                                    <span className="mr-2">
                                                                        Acceptance: {problem.acceptance_rate.toFixed(1)}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {problem.tags && problem.tags.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {problem.tags.map((tag, idx) => (
                                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Desktop view */}
                                                    <div className="hidden md:grid md:grid-cols-12 md:gap-4">
                                                        <div className="md:col-span-1 flex items-center text-gray-900">
                                                            {problem.problem_id}
                                                        </div>
                                                        <div className="md:col-span-5 flex items-center">
                                                            <p className="text-indigo-600 font-medium">{problem.title}</p>
                                                        </div>
                                                        <div className="md:col-span-2 flex items-center">
                                                            <p
                                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyClass(
                                                                    problem.difficulty
                                                                )}`}
                                                            >
                                                                {problem.difficulty || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div className="md:col-span-2 flex items-center text-sm text-gray-500">
                                                            {problem.acceptance_rate !== undefined ?
                                                                `${problem.acceptance_rate.toFixed(1)}%` : 'N/A'}
                                                        </div>
                                                        <div className="md:col-span-2 flex items-center">
                                                            <div className="flex flex-wrap gap-1">
                                                                {problem.tags && problem.tags.length > 0 ? (
                                                                    <span className="text-xs text-gray-500">
                                                                        {problem.tags.join(', ')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">No tags</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 