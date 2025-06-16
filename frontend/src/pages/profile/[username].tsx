import { useRouter } from 'next/router';
import { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Globe, Edit, Trophy, Target, Code, TrendingUp, Clock, Star, ArrowUp, MessageSquare, Users, Calendar } from 'lucide-react';
import '@/app/globals.css';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<SubmissionHeatmap[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [discussionsCount, setDiscussionsCount] = useState(0);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    website?: string;
  }>({});

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
      const profileResponse = await axios.get(`http://localhost:8080/api/users/${username}/profile`);
      setProfile(profileResponse.data);

      // Fetch user data
      const userResponse = await axios.get(`http://localhost:8080/api/users/${username}`);
      setUser(userResponse.data);

      // Fetch user stats
      try {
        const statsResponse = await axios.get(`http://localhost:8080/api/users/${username}/stats`);
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
        const checkinsResponse = await axios.get(`http://localhost:8080/api/users/${username}/checkins`);
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
        const submissionsResponse = await axios.get(`http://localhost:8080/api/users/${username}/submissions?limit=5`);
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
        const languageResponse = await axios.get(`http://localhost:8080/api/users/${username}/languages`);
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
        const skillsResponse = await axios.get(`http://localhost:8080/api/users/${username}/skills`);
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
        const authResponse = await axios.get(`http://localhost:8080/api/auth-status`, { withCredentials: true });
        if (authResponse.data.user) {
          setLoggedInUser(authResponse.data.user);
        }
      } catch (error) {
        console.error('Error fetching auth status:', error);
      }

      // Fetch discussion count
      try {
        const discussionCountResponse = await axios.get(`http://localhost:8080/api/users/${username}/discussion-count`);
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
      const authCheck = await axios.get('http://localhost:8080/api/auth-status', {
        withCredentials: true
      });

      if (!authCheck.data.isLoggedIn) {
        setUpdateError('Your session has expired. Please log in again.');
        setUpdateLoading(false);
        return;
      }

      // Now update the profile
      const response = await axios.put('http://localhost:8080/api/profile', updatedProfile, {
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

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Profile...</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Profile not found</h1>
            <p className="mt-2 text-gray-600">The user you're looking for doesn't exist.</p>
          </div>
        </div>
      </>
    );
  }

  const canEdit = loggedInUser && loggedInUser.username === username;

  return (
    <>
      <Head>
        <title>{username}'s Profile - Online Judge</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={username as string} />
                <AvatarFallback className="text-2xl bg-indigo-600 text-white">
                  {username?.toString().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{username}</h1>
                    <p className="text-lg text-gray-600">
                      Rank {userStats?.ranking?.toLocaleString()}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      variant="outline"
                      className="mt-4 md:mt-0"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <a
                        href={ensureHttps(profile.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline overflow-hidden text-ellipsis max-w-[250px]"
                      >
                        {profile.website.replace(/^https?:\/\//i, '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Joined Jun 2025
                  </div>
                </div>

                {profile.bio && (
                  <p className="mt-4 text-gray-700">{profile.bio}</p>
                )}

                {isEditing && (
                  <div className="mt-6">
                    <form onSubmit={handleUpdate} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bio</label>
                        <textarea
                          name="bio"
                          defaultValue={profile.bio}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input
                          type="text"
                          name="location"
                          defaultValue={profile.location}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Website</label>
                        <input
                          type="text"
                          name="website"
                          defaultValue={profile.website}
                          placeholder="https://example.com"
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            if (value && !value.startsWith('http')) {
                              setFormErrors({
                                website: 'URL should start with http:// or https://'
                              });
                            } else {
                              setFormErrors({});
                            }
                          }}
                          className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${formErrors.website ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                        {formErrors.website ? (
                          <p className="mt-1 text-sm text-red-600">{formErrors.website}</p>
                        ) : (
                          <p className="mt-1 text-sm text-gray-500">
                            Include https:// for valid URLs (e.g., https://example.com)
                          </p>
                        )}
                      </div>

                      {updateError && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                          <p className="text-red-700 text-sm">{updateError}</p>
                        </div>
                      )}

                      {updateSuccess && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4">
                          <p className="text-green-700 text-sm">Profile updated successfully!</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button type="submit" disabled={updateLoading}>
                          {updateLoading ? (
                            <>
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
                              Saving...
                            </>
                          ) : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          disabled={updateLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Stats */}
            <div className="md:col-span-1 space-y-6">
              {/* Problem Solving Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-indigo-600" />
                    Problem Solving
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Problems Solved</span>
                    <span className="font-semibold">{userStats?.totalSolved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Easy</span>
                    <span className="font-semibold text-green-600">{userStats?.easySolved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Medium</span>
                    <span className="font-semibold text-yellow-600">{userStats?.mediumSolved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Hard</span>
                    <span className="font-semibold text-red-600">{userStats?.hardSolved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Submissions</span>
                    <span className="font-semibold">{userStats?.totalSubmissions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Acceptance Rate</span>
                    <span className="font-semibold">{userStats?.acceptanceRate?.toFixed(1) ?? '0.0'}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Streaks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    Streaks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Streak</span>
                    <span className="font-semibold">{userStats?.currentStreak} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Max Streak</span>
                    <span className="font-semibold">{userStats?.maxStreak} days</span>
                  </div>
                </CardContent>
              </Card>

              {/* Programming Languages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Code className="h-5 w-5 text-indigo-600" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {languageStats.map((lang, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{lang.language.charAt(0).toUpperCase() + lang.language.slice(1)}</span>
                          <span className="text-sm text-gray-600">{lang.count} ({lang.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${lang.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-600" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {skills.map((skill, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{skill.name}</p>
                          <p className="text-sm text-gray-500">{skill.problemsSolved} problems</p>
                        </div>
                        <Badge
                          className={
                            skill.level === 'Beginner' ? 'bg-blue-100 text-blue-800' :
                              skill.level === 'Intermediate' ? 'bg-indigo-100 text-indigo-800' :
                                skill.level === 'Advanced' ? 'bg-violet-100 text-violet-800' :
                                  'bg-purple-100 text-purple-800'
                          }
                        >
                          {skill.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Activity */}
            <div className="md:col-span-2 space-y-6">
              {/* Activity Heatmap */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap">
                    {heatmapData.map((data, idx) => (
                      <div
                        key={idx}
                        className={`h-3 w-3 m-0.5 rounded-sm ${getHeatmapColor(data.count)}`}
                        title={`${data.date}: ${data.count} activities`}
                      ></div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-gray-100 rounded-sm mr-1"></div>
                      <span>0</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-200 rounded-sm mr-1"></div>
                      <span>1-2</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-300 rounded-sm mr-1"></div>
                      <span>3-4</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-400 rounded-sm mr-1"></div>
                      <span>5-6</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-500 rounded-sm mr-1"></div>
                      <span>7+</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    Recent Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-gray-500">Problem</th>
                          <th className="text-left py-2 font-medium text-gray-500">Status</th>
                          <th className="text-left py-2 font-medium text-gray-500">Language</th>
                          <th className="text-left py-2 font-medium text-gray-500">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSubmissions.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-gray-500">
                              No submissions found
                            </td>
                          </tr>
                        ) : (
                          recentSubmissions.map((submission, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2">
                                <Link href={`/problems/${submission.problem_id || submission.id}`} className="flex items-center gap-2">
                                  <span className="font-medium text-indigo-600 hover:underline">{submission.problem_title || submission.problemTitle}</span>
                                  <Badge
                                    className={
                                      (submission.difficulty === 'Easy' || submission.difficulty === 'EASY') ? 'bg-green-100 text-green-800' :
                                        (submission.difficulty === 'Medium' || submission.difficulty === 'MEDIUM') ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                    }
                                  >
                                    {submission.difficulty}
                                  </Badge>
                                </Link>
                              </td>
                              <td className="py-2">
                                <span className={
                                  (submission.status === 'Accepted' || submission.status === 'ACCEPTED') ? 'text-green-600' :
                                    (submission.status === 'Wrong Answer' || submission.status === 'WRONG_ANSWER') ? 'text-red-600' :
                                      'text-yellow-600'
                                }>
                                  {submission.status}
                                </span>
                              </td>
                              <td className="py-2 text-gray-600">{submission.language}</td>
                              <td className="py-2 text-gray-500">{submission.timestamp_text || submission.timestamp}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Community */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    Community
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-indigo-50 p-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-indigo-900">Ranking</h3>
                        <p className="text-indigo-700">Top {userStats && userStats.totalUsers > 0 ? ((userStats.ranking / userStats.totalUsers) * 100).toFixed(2) : '0.0'}%</p>
                      </div>
                      <div className="text-2xl font-bold text-indigo-900">{userStats?.ranking?.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-green-900">Discussions</h3>
                        <p className="text-green-700">Comments and threads</p>
                      </div>
                      <div className="text-2xl font-bold text-green-900">{discussionsCount}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfilePage;
