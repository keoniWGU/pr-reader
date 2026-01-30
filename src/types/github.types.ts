/**
 * Type definitions for GitHub API entities
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: GitHubUser;
  body: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  html_url: string;
  draft: boolean;
  labels: GitHubLabel[];
  requested_reviewers: GitHubUser[];
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface PaginationInfo {
  page: number;
  perPage: number;
  hasNextPage: boolean;
  totalFetched: number;
}

export interface FetchPRsOptions {
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  direction?: 'asc' | 'desc';
  perPage?: number;
  maxPages?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export type DisplayFormat = 'compact' | 'detailed' | 'json';

export interface FilterOptions {
  author?: string;
  label?: string;
  minComments?: number;
}

export interface SortOptions {
  field: 'created' | 'updated' | 'comments' | 'title';
  direction: 'asc' | 'desc';
}
