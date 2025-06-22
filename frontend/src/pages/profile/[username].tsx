import { useRouter } from 'next/router';
import { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';
import {
  Trophy,
  Star,
  Target,
  Code,
  TrendingUp,
  Clock,
  Calendar,
  MapPin,
  Globe,
  Edit,
  Users,
  Award,
  Zap,
  Flame,
  Shield,
  Crown,
  Share2,
  Download,
  ExternalLink,
  GitBranch,
  BookOpen,
  Activity,
  MessageSquare,
  Heart,
  Eye,
  BarChart3,
  PieChart,
  Settings,
  Mail,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';
import '@/app/globals.css';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthContext } from '@/lib/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import SkillRadarChart from '@/components/ui/SkillRadarChart';
import { AchievementGrid, Achievement } from '@/components/ui/AchievementBadge';
import { ProgressRing, StatCard, DifficultyProgress } from '@/components/ui/ProgressComponents';
import Skeleton from '@/components/ui/Skeleton';

interface Profile {
  bio: string;
  location: string;
  website: string;
}

interface User {
  username: string;
  firstname?: string;
  lastname?: string;
  email?: string;
}

interface UserStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptanceRate: number;
  ranking: number;
  totalUsers: number;
  maxStreak: number;
  currentStreak: number;
  lastUpdatedAt?: string;
}

interface SubmissionHeatmap {
  date: string;
  count: number;
}

interface RecentSubmission {
  id: string;
  problemTitle?: string;
  status: string;
  language: string;
  timestamp?: string;
  difficulty: string;
  problem_id?: string;
  problem_title?: string;
  timestamp_text?: string;
}

interface LanguageData {
  language: string;
  submission_count: number;
  percentage_of_total: number;
}

interface SkillData {
  skill_name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  problems_solved: number;
}

interface LanguageStats {
  language: string;
  count: number;
  percentage: number;
}

interface Skill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  problemsSolved: number;
}

// Utility function for URL validation
const isValidUrl = (url: string): boolean => {
  // Check if URL is empty
  if (!url.trim()) return true; // Empty URLs are allowed

  // Check if URL has http/https protocol
  if (!url.match(/^https?:\/\//i)) return false;

  // Check if URL has valid domain structure
  return !!url.match(/^https?:\/\/.+\..+/i);
};

// Utility function to ensure URL has protocol
const ensureHttps = (url: string): string => {
  if (!url.trim()) return '';

  // Add https:// if no protocol exists
  if (!url.match(/^https?:\/\//i)) {
    return `https://${url}`;
  }

  return url;
};

const UserProfilePage = () => {
  const router = useRouter();
  const { username } = router.query;
  const { isDark } = useTheme();
  const { user: loggedInUser } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<SubmissionHeatmap[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [discussionsCount, setDiscussionsCount] = useState(0);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    website?: string;
  }>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'activity' | 'social'>('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Generate random heatmap data for fallback
  const generateHeatmapData = (): SubmissionHeatmap[] => {
    const data: SubmissionHeatmap[] = [];
    const today = new Date();

    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const count = Math.random() > 0.7 ? Math.floor(Math.random() * 4) + 1 : 0;
      data.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }
    return data;
  };

  // Convert check-in data from API to heatmap format
  const generateHeatmapFromCheckins = (checkins: Record<string, boolean>): SubmissionHeatmap[] => {
    const data: SubmissionHeatmap[] = [];
    const today = new Date();

    // Create a map for quick lookup of check-in dates
    const checkinMap: Record<string, boolean> = checkins || {};

    // Generate a complete 365-day heatmap
    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // If the user checked in on this date, set count to a value between 1-4
      // In a real app, you might base this on submission counts for the day
      const count = checkinMap[dateStr] ? 3 : 0;

      data.push({
        date: dateStr,
        count
      });
    }
    return data;
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-300';
    if (count === 3) return 'bg-green-400';
    return 'bg-green-500';
  };

  useEffect(() => {
    if (username) {
      fetchUserData();
    }
  }, [username]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch basic profile data
      const profileResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}/profile`);
      setProfile(profileResponse.data);

      // Fetch user data
      const userResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}`);
      setUser(userResponse.data);

      // Fetch user stats
      try {
        const statsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}/stats`);
        const fetchedStats = statsResponse.data;
        const formattedStats: UserStats = {
          totalSolved: fetchedStats.total_solved,
          easySolved: fetchedStats.easy_solved,
          mediumSolved: fetchedStats.medium_solved,
          hardSolved: fetchedStats.hard_solved,
          totalSubmissions: fetchedStats.total_submissions,
          acceptanceRate: fetchedStats.acceptance_rate,
          ranking: fetchedStats.ranking,
          totalUsers: fetchedStats.total_users,
          maxStreak: fetchedStats.max_streak,
          currentStreak: fetchedStats.current_streak,
          lastUpdatedAt: fetchedStats.last_updated_at,
        };
        setUserStats(formattedStats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
        // Set default stats if API fails
        setUserStats({
          totalSolved: 0,
          easySolved: 0,
          mediumSolved: 0,
          hardSolved: 0,
          totalSubmissions: 0,
          acceptanceRate: 0,
          ranking: 0,
          totalUsers: 0,
          maxStreak: 0,
          currentStreak: 0
        });
      }

      // Fetch check-in data for heatmap
      try {
        const checkinsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}/checkins`);
        const checkinData = checkinsResponse.data;

        // Convert checkin data to heatmap format
        const heatmap = generateHeatmapFromCheckins(checkinData.checkin_days || {});
        setHeatmapData(heatmap);
      } catch (error) {
        console.error('Error fetching user checkins:', error);
        // Generate random heatmap data if API fails
        const heatmap = generateHeatmapData();
        setHeatmapData(heatmap);
      }

      // Fetch recent submissions
      try {
        const submissionsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}/submissions?limit=5`);
        setRecentSubmissions(submissionsResponse.data);
      } catch (error) {
        console.error('Error fetching recent submissions:', error);
        // Set mock submissions if API fails
        setRecentSubmissions([
          { id: '1', problemTitle: 'Two Sum', status: 'Accepted', language: 'JavaScript', timestamp: '3 days ago', difficulty: 'Easy' },
          { id: '2', problemTitle: 'Palindrome Number', status: 'Accepted', language: 'Python', timestamp: '20 days ago', difficulty: 'Easy' },
          { id: '3', problemTitle: 'Valid Parentheses', status: 'Accepted', language: 'Java', timestamp: '3 months ago', difficulty: 'Easy' },
          { id: '4', problemTitle: 'Remove Element', status: 'Accepted', language: 'C++', timestamp: '4 months ago', difficulty: 'Easy' },
          { id: '5', problemTitle: 'Kth Largest Element in an Array', status: 'Accepted', language: 'Python', timestamp: '4 months ago', difficulty: 'Medium' },
          { id: '6', problemTitle: 'Rotate Array', status: 'Accepted', language: 'Python', timestamp: '4 months ago', difficulty: 'Medium' }
        ]);
      }

      // Fetch language statistics
      try {
        const languageResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}/languages`);
        const languageData = languageResponse.data;

        // Format the language data for display
        const formattedLanguages = languageData.languages.map((lang: LanguageData) => ({
          language: lang.language,
          count: lang.submission_count,
          percentage: lang.percentage_of_total
        }));

        setLanguageStats(formattedLanguages);
      } catch (error) {
        console.error('Error fetching language stats:', error);
        // Set mock language data if API fails
        setLanguageStats([
          { language: 'C++', count: 97, percentage: 65.8 },
          { language: 'Java', count: 9, percentage: 6.1 },
          { language: 'Python', count: 2, percentage: 1.4 },
          { language: 'JavaScript', count: 39, percentage: 26.4 }
        ]);
      }

      // Fetch skills data
      try {
        const skillsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}/skills`);
        const skillsData = skillsResponse.data;

        // Format the skills data for display
        const formattedSkills = skillsData.skills.map((skill: SkillData) => ({
          name: skill.skill_name,
          level: skill.level,
          problemsSolved: skill.problems_solved
        }));

        setSkills(formattedSkills);
      } catch (error) {
        console.error('Error fetching skills data:', error);
        // Set mock skills data if API fails
        setSkills([
          { name: 'Dynamic Programming', level: 'Advanced', problemsSolved: 16 },
          { name: 'Backtracking', level: 'Intermediate', problemsSolved: 8 }
        ]);
      }

      // Check if current user can edit
      try {
        const authResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth-status`, { withCredentials: true });
        // Remove the setLoggedInUser call since we're using useAuthContext
        // The loggedInUser is already available from the context
      } catch (error) {
        console.error('Error fetching auth status:', error);
      }

      // Fetch discussion count
      try {
        const discussionCountResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${username}/discussion-count`);
        setDiscussionsCount(discussionCountResponse.data.total_discussions);
      } catch (error) {
        console.error('Error fetching discussion count:', error);
        // Set a default value if API fails
        setDiscussionsCount(0);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    setFormErrors({});

    // Check if user is logged in
    if (!loggedInUser) {
      setUpdateError('You must be logged in to update your profile.');
      setUpdateLoading(false);
      return;
    }

    const target = e.target as typeof e.target & {
      bio: { value: string };
      location: { value: string };
      website: { value: string };
    };

    // Validate and format website URL if provided
    const websiteValue = target.website.value.trim();
    let formattedWebsite = '';

    if (websiteValue) {
      // Try to format the URL
      formattedWebsite = ensureHttps(websiteValue);

      // Validate the URL
      if (!isValidUrl(formattedWebsite)) {
        setFormErrors({ website: 'Please enter a valid URL (e.g., https://example.com)' });
        setUpdateLoading(false);
        return;
      }
    }

    const updatedProfile = {
      bio: target.bio.value,
      location: target.location.value,
      website: formattedWebsite,
    };

    try {
      // First check auth status to ensure cookie is valid
      const authCheck = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth-status`, {
        withCredentials: true
      });

      if (!authCheck.data.isLoggedIn) {
        setUpdateError('Your session has expired. Please log in again.');
        setUpdateLoading(false);
        return;
      }

      // Now update the profile
      const response = await axios.put(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`, updatedProfile, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Update profile with returned data or our updated values
      if (response.data) {
        setProfile(response.data);
      } else {
        // If no data returned, update the local profile state with our values
        setProfile(prev => ({
          ...prev,
          ...updatedProfile
        }));
      }

      setIsEditing(false);
      setUpdateSuccess(true);

      // Refresh profile data to ensure we have the latest
      if (username) {
        fetchUserData();
      }

      // Show success message temporarily
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);

      if (error.response) {
        // Handle specific error codes
        if (error.response.status === 401) {
          setUpdateError('Authentication error. Please log in again.');
        } else {
          setUpdateError(`Failed to update profile: ${error.response.data?.message || error.response.statusText}`);
        }
      } else {
        setUpdateError('Failed to update profile. Please try again.');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  // Mock data for demonstration
  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Solve your first problem',
      icon: 'trophy',
      color: '#10B981',
      rarity: 'common',
      unlocked: true,
      unlockedAt: '2025-06-01'
    },
    {
      id: '2',
      title: 'Speed Demon',
      description: 'Solve 10 problems in one day',
      icon: 'zap',
      color: '#F59E0B',
      rarity: 'rare',
      unlocked: true,
      unlockedAt: '2025-06-05'
    },
    {
      id: '3',
      title: 'Master Coder',
      description: 'Solve 100 hard problems',
      icon: 'crown',
      color: '#8B5CF6',
      rarity: 'epic',
      unlocked: false,
      progress: 45,
      maxProgress: 100
    },
    {
      id: '4',
      title: 'Algorithm Legend',
      description: 'Achieve top 1% ranking',
      icon: 'star',
      color: '#F59E0B',
      rarity: 'legendary',
      unlocked: false,
      progress: 2,
      maxProgress: 1
    }
  ];

  const skillsData = [
    { skill: 'Arrays', level: 4.2 },
    { skill: 'Dynamic Programming', level: 3.8 },
    { skill: 'Graphs', level: 3.5 },
    { skill: 'Trees', level: 4.0 },
    { skill: 'Strings', level: 4.5 },
    { skill: 'Math', level: 3.2 }
  ];

  const canEdit = loggedInUser && loggedInUser.username === username;

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Profile...</title>
        </Head>
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-96 w-full" />
                <div className="md:col-span-2 space-y-6">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profile || !user) {
    return (
      <>
        <Head>
          <title>Profile Not Found</title>
        </Head>
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <GlassCard className="text-center py-12 px-8">
            <Users className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Profile not found
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              The user you're looking for doesn't exist.
            </p>
            <AnimatedButton href="/" variant="primary">
              Go Home
            </AnimatedButton>
          </GlassCard>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{username}'s Profile | CodeSorted</title>
        <meta name="description" content={`${username}'s coding profile - ${userStats?.totalSolved || 0} problems solved`} />
      </Head>

      <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-purple-500' : 'bg-purple-300'}`} />
          <div className={`absolute top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-10 ${isDark ? 'bg-blue-500' : 'bg-blue-300'}`} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Profile Header */}
          <GlassCard className="mb-8" padding="lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1">
                    <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-600 dark:text-gray-300">
                        {username?.toString().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {/* Online status indicator */}
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-800" />
                </div>

                <div className="space-y-3">
                  <div>
                    <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {username}
                    </h1>
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Trophy className="w-4 h-4" />
                        <span>Rank #{userStats?.ranking?.toLocaleString()}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Target className="w-4 h-4" />
                        <span>{userStats?.totalSolved} problems solved</span>
                      </div>
                    </div>
                  </div>

                  {/* Social Info */}
                  <div className="flex items-center gap-4 text-sm">
                    {profile.location && (
                      <div className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <MapPin className="w-4 h-4" />
                        {profile.location}
                      </div>
                    )}
                    {profile.website && (
                      <a
                        href={ensureHttps(profile.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                      >
                        <Globe className="w-4 h-4" />
                        {profile.website.replace(/^https?:\/\//i, '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <div className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4" />
                      Joined Jun 2025
                    </div>
                  </div>

                  {profile.bio && (
                    <p className={`max-w-2xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats and Actions */}
              <div className="flex-1 flex flex-col lg:items-end gap-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {followerCount}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Followers
                    </div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {followingCount}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Following
                    </div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {userStats?.currentStreak || 0}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Day Streak
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {canEdit ? (
                    <>
                      <AnimatedButton
                        onClick={() => setIsEditing(!isEditing)}
                        variant="primary"
                        icon={Edit}
                      >
                        Edit Profile
                      </AnimatedButton>
                      <AnimatedButton
                        variant="secondary"
                        icon={Settings}
                      >
                        Settings
                      </AnimatedButton>
                    </>
                  ) : (
                    <>
                      <AnimatedButton
                        onClick={() => setIsFollowing(!isFollowing)}
                        variant={isFollowing ? "secondary" : "primary"}
                        icon={isFollowing ? Users : Heart}
                        gradient={!isFollowing}
                        glow={!isFollowing}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </AnimatedButton>
                      <AnimatedButton
                        variant="secondary"
                        icon={MessageSquare}
                      >
                        Message
                      </AnimatedButton>
                    </>
                  )}
                  <AnimatedButton
                    variant="ghost"
                    icon={Share2}
                    size="sm"
                  >
                    Share
                  </AnimatedButton>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            {isEditing && (
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        defaultValue={profile.bio}
                        rows={4}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-300 ${isDark
                          ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                          } focus:ring-2 focus:ring-blue-500/20`}
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Location
                        </label>
                        <input
                          type="text"
                          name="location"
                          defaultValue={profile.location}
                          className={`w-full px-4 py-3 rounded-lg border transition-all duration-300 ${isDark
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                            } focus:ring-2 focus:ring-blue-500/20`}
                          placeholder="Your location"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Website
                        </label>
                        <input
                          type="url"
                          name="website"
                          defaultValue={profile.website}
                          className={`w-full px-4 py-3 rounded-lg border transition-all duration-300 ${isDark
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                            } focus:ring-2 focus:ring-blue-500/20`}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                  </div>

                  {updateError && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                      {updateError}
                    </div>
                  )}

                  {updateSuccess && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
                      Profile updated successfully!
                    </div>
                  )}

                  <div className="flex gap-3">
                    <AnimatedButton
                      type="submit"
                      variant="primary"
                      disabled={updateLoading}
                      loading={updateLoading}
                    >
                      Save Changes
                    </AnimatedButton>
                    <AnimatedButton
                      type="button"
                      variant="secondary"
                      onClick={() => setIsEditing(false)}
                      disabled={updateLoading}
                    >
                      Cancel
                    </AnimatedButton>
                  </div>
                </form>
              </div>
            )}
          </GlassCard>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 p-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'achievements', label: 'Achievements', icon: Trophy },
                { id: 'activity', label: 'Activity', icon: Activity },
                { id: 'social', label: 'Social', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${activeTab === tab.id
                      ? isDark
                        ? 'bg-gray-700 text-white shadow-lg'
                        : 'bg-white text-gray-900 shadow-lg'
                      : isDark
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Left Column: Problem Solving Overview */}
              <div className="xl:col-span-1">
                <GlassCard padding="lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Progress
                    </h3>
                  </div>

                  <div className="text-center mb-6">
                    <ProgressRing
                      progress={userStats?.totalSolved || 0}
                      total={500}
                      size={140}
                      color="#3B82F6"
                    />
                  </div>

                  <DifficultyProgress
                    easy={{ solved: userStats?.easySolved || 0, total: 200 }}
                    medium={{ solved: userStats?.mediumSolved || 0, total: 200 }}
                    hard={{ solved: userStats?.hardSolved || 0, total: 100 }}
                  />
                </GlassCard>
              </div>

              {/* Center Column: Stats Grid */}
              <div className="xl:col-span-2 space-y-6">
                {/* Performance Stats - Simplified Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Acceptance Rate"
                    value={`${userStats?.acceptanceRate?.toFixed(1) || '0.0'}%`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="#10B981"
                    trend={{ value: 5.2, isPositive: true }}
                  />
                  <StatCard
                    title="Total Submissions"
                    value={userStats?.totalSubmissions || 0}
                    icon={<Code className="w-5 h-5" />}
                    color="#8B5CF6"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Current Streak"
                    value={`${userStats?.currentStreak || 0} days`}
                    icon={<Flame className="w-5 h-5" />}
                    color="#F59E0B"
                    progress={{ current: userStats?.currentStreak || 0, total: userStats?.maxStreak || 1 }}
                  />
                  <StatCard
                    title="Global Rank"
                    value={`#${userStats?.ranking?.toLocaleString() || '0'}`}
                    icon={<Crown className="w-5 h-5" />}
                    color="#EF4444"
                    subtitle={`Top ${userStats && userStats.totalUsers > 0 ? ((userStats.ranking / userStats.totalUsers) * 100).toFixed(1) : '0.0'}%`}
                  />
                </div>

                {/* Skills Radar - More Compact */}
                <GlassCard padding="lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Star className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Skills Overview
                    </h3>
                  </div>

                  <div className="flex justify-center">
                    <SkillRadarChart data={skillsData} size={200} />
                  </div>
                </GlassCard>
              </div>

              {/* Right Column: Activity and Languages */}
              <div className="xl:col-span-1 space-y-6">
                {/* Activity Heatmap - Simplified */}
                <GlassCard padding="lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <Activity className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Activity
                    </h3>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {heatmapData.slice(-49).map((data, idx) => (
                      <div
                        key={idx}
                        className={`h-2.5 w-2.5 rounded-sm transition-colors duration-300 ${getHeatmapColor(data.count)}`}
                        title={`${data.date}: ${data.count} activities`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Less</span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-2.5 w-2.5 rounded-sm ${getHeatmapColor(level)}`}
                        />
                      ))}
                    </div>
                    <span>More</span>
                  </div>
                </GlassCard>

                {/* Languages - Compact */}
                <GlassCard padding="lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Code className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Languages
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {languageStats.slice(0, 4).map((lang, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {lang.language}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {lang.percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                            style={{ width: `${lang.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* Recent Activity Section - Separate from main grid */}
          {activeTab === 'overview' && (
            <div className="mt-8">
              <GlassCard padding="lg">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                      <Clock className="w-5 h-5 text-pink-600" />
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Recent Activity
                    </h3>
                  </div>
                  <AnimatedButton
                    href="/submissions"
                    variant="ghost"
                    size="sm"
                  >
                    View All
                  </AnimatedButton>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentSubmissions.slice(0, 6).map((submission, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${isDark ? 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50' : 'bg-gray-50/50 border-gray-200 hover:bg-white'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          href={`/problems/${submission.problem_id || submission.id}`}
                          className={`font-medium hover:underline text-sm line-clamp-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                        >
                          {submission.problem_title || submission.problemTitle}
                        </Link>
                        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${submission.status === 'Accepted' || submission.status === 'ACCEPTED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {submission.status === 'Accepted' || submission.status === 'ACCEPTED' ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{submission.language}</span>
                        <span>{submission.timestamp_text || submission.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-8">
              <GlassCard padding="lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Achievements
                    </h2>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Your coding milestones and accomplishments
                    </p>
                  </div>
                </div>

                <AchievementGrid achievements={achievements} />
              </GlassCard>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GlassCard padding="lg">
                <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Activity Timeline
                </h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Detailed activity timeline coming soon...
                </p>
              </GlassCard>

              <GlassCard padding="lg">
                <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Contest History
                </h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Contest participation history coming soon...
                </p>
              </GlassCard>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GlassCard padding="lg">
                <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Following
                </h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Social features coming soon...
                </p>
              </GlassCard>

              <GlassCard padding="lg">
                <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Discussions
                </h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Discussion threads and comments coming soon...
                </p>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserProfilePage;
