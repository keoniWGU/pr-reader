import { Octokit } from '@octokit/rest';
import { PullRequest, FetchPRsOptions, PaginationInfo } from '../types/github.types';
import { CacheService } from './cache.service';

/**
 * GitHub service for interacting with the GitHub API
 * Handles authentication, PR fetching, pagination, and caching
 */
export class GitHubService {
  private octokit: Octokit;
  private cache: CacheService;

  constructor(token: string) {
    if (!token || token.trim() === '') {
      throw new Error('GitHub token is required');
    }

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'gh-pr-viewer v1.0.0',
    });

    this.cache = CacheService.getInstance();
  }

  /**
   * Verify GitHub token is valid by making a test API call
   * @returns True if token is valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch open pull requests from a repository with pagination support
   * @param options - Fetch options including owner, repo, state, sorting, etc.
   * @returns Array of pull requests and pagination info
   */
  async fetchPullRequests(
    options: FetchPRsOptions
  ): Promise<{ prs: PullRequest[]; pagination: PaginationInfo }> {
    const {
      owner,
      repo,
      state = 'open',
      sort = 'created',
      direction = 'desc',
      perPage = 30,
      maxPages = 5,
    } = options;

    // Check cache first
    const cacheKey = CacheService.generateKey(owner, repo, `prs-${state}-${sort}-${direction}`);
    const cached = this.cache.get<{ prs: PullRequest[]; pagination: PaginationInfo }>(cacheKey);

    if (cached) {
      console.log('✓ Returning cached results');
      return cached;
    }

    const allPRs: PullRequest[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
      while (hasNextPage && currentPage <= maxPages) {
        const response = await this.octokit.pulls.list({
          owner,
          repo,
          state,
          sort,
          direction,
          per_page: perPage,
          page: currentPage,
        });

        if (response.data.length === 0) {
          hasNextPage = false;
          break;
        }

        // Map to our PullRequest type
        const prs = response.data.map((pr) => this.mapToPullRequest(pr));
        allPRs.push(...prs);

        // Check if there's a next page using Link header
        const linkHeader = response.headers.link;
        hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;

        currentPage++;
      }

      const result = {
        prs: allPRs,
        pagination: {
          page: currentPage - 1,
          perPage,
          hasNextPage,
          totalFetched: allPRs.length,
        },
      };

      // Cache the results
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      if (this.isOctokitError(error)) {
        if (error.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found or you don't have access`);
        } else if (error.status === 401) {
          throw new Error('Authentication failed. Please check your GitHub token');
        } else if (error.status === 403) {
          if (error.message.includes('rate limit')) {
            throw new Error('GitHub API rate limit exceeded. Please try again later');
          }
          throw new Error('Access forbidden. Please check your token permissions');
        }
      }
      throw new Error(`Failed to fetch pull requests: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get rate limit information
   * @returns Rate limit data including remaining requests and reset time
   */
  async getRateLimit(): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    try {
      const response = await this.octokit.rateLimit.get();
      const { remaining, limit, reset } = response.data.rate;

      return {
        remaining,
        limit,
        reset: new Date(reset * 1000),
      };
    } catch (error) {
      throw new Error(`Failed to get rate limit: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Map Octokit PR response to our PullRequest type
   */
  private mapToPullRequest(pr: any): PullRequest {
    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      user: {
        login: pr.user.login,
        id: pr.user.id,
        avatar_url: pr.user.avatar_url,
        html_url: pr.user.html_url,
      },
      body: pr.body,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      html_url: pr.html_url,
      draft: pr.draft,
      labels: pr.labels.map((label: any) => ({
        id: label.id,
        name: label.name,
        color: label.color,
        description: label.description,
      })),
      requested_reviewers: pr.requested_reviewers.map((reviewer: any) => ({
        login: reviewer.login,
        id: reviewer.id,
        avatar_url: reviewer.avatar_url,
        html_url: reviewer.html_url,
      })),
      comments: pr.comments,
      review_comments: pr.review_comments,
      commits: pr.commits,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
    };
  }

  /**
   * Type guard for Octokit errors
   */
  private isOctokitError(error: unknown): error is { status: number; message: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as any).status === 'number'
    );
  }

  /**
   * Extract error message from unknown error type
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
