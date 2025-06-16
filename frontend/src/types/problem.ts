// Corresponds to backend's ProblemListItem
export interface ProblemListItemType {
  id: string; // MongoDB _id as hex string
  problem_id: string; // Custom Problem ID (e.g., "P001")
  title: string;
  difficulty: string;
  tags?: string[];
}

// Corresponds to backend's full Problem struct
export interface ProblemType extends ProblemListItemType {
  statement: string;
  constraints_text: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  author?: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  sample_test_cases?: TestCaseType[]; // Added field
  // Add other fields if your backend sends them for a single problem view
}

// For API error responses
export interface ApiError {
  message: string;
}

export interface TestCaseType {
  id?: string; 
  input: string;
  expected_output: string;
  is_sample?: boolean;
  notes?: string;
  sequence_number?: number;
}

// Discussion thread types
export interface ThreadType {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  username: string;
  is_locked: boolean;
}

// Comment types
export interface CommentType {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  username: string;
  is_deleted: boolean;
}

// Create thread payload
export interface CreateThreadPayload {
  problem_id: string;
  title: string;
  content: string;
}

// Create comment payload
export interface CreateCommentPayload {
  thread_id: string;
  content: string;
}

// Vote payload
export interface VotePayload {
  target_id: string;
  type: 'thread' | 'comment';
  value: -1 | 0 | 1; // -1 = downvote, 0 = remove vote, 1 = upvote
}

// API response types
export interface ThreadsResponse {
  threads: ThreadType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CommentsResponse {
  comments: CommentType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}