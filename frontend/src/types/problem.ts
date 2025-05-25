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