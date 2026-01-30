import { Formatter } from '../utils/formatter';
import { PullRequest } from '../types/github.types';

describe('Formatter', () => {
  const mockPR: PullRequest = {
    id: 1,
    number: 123,
    title: 'Test PR',
    state: 'open',
    user: {
      login: 'testuser',
      id: 1,
      avatar_url: 'https://example.com/avatar.jpg',
      html_url: 'https://github.com/testuser',
    },
    body: 'This is a test pull request',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    closed_at: null,
    merged_at: null,
    html_url: 'https://github.com/owner/repo/pull/123',
    draft: false,
    labels: [
      { id: 1, name: 'bug', color: 'ff0000', description: 'Bug fix' },
      { id: 2, name: 'feature', color: '00ff00', description: 'New feature' },
    ],
    requested_reviewers: [
      {
        login: 'reviewer1',
        id: 2,
        avatar_url: 'https://example.com/reviewer.jpg',
        html_url: 'https://github.com/reviewer1',
      },
    ],
    comments: 5,
    review_comments: 3,
    commits: 10,
    additions: 100,
    deletions: 50,
    changed_files: 5,
  };

  describe('formatPullRequests', () => {
    it('should return message for empty array', () => {
      const result = Formatter.formatPullRequests([], 'compact');
      expect(result).toContain('No pull requests found');
    });

    it('should format in compact mode', () => {
      const result = Formatter.formatPullRequests([mockPR], 'compact');
      expect(result).toContain('#123');
      expect(result).toContain('Test PR');
      expect(result).toContain('@testuser');
    });

    it('should format in detailed mode', () => {
      const result = Formatter.formatPullRequests([mockPR], 'detailed');
      expect(result).toContain('PR #123');
      expect(result).toContain('Test PR');
      expect(result).toContain('testuser');
      expect(result).toContain('Author:');
      expect(result).toContain('Created:');
      expect(result).toContain('Stats:');
    });

    it('should format in json mode', () => {
      const result = Formatter.formatPullRequests([mockPR], 'json');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].number).toBe(123);
      expect(parsed[0].title).toBe('Test PR');
    });
  });

  describe('filterPullRequests', () => {
    const prs: PullRequest[] = [
      { ...mockPR, user: { ...mockPR.user, login: 'alice' } },
      { ...mockPR, number: 124, user: { ...mockPR.user, login: 'bob' } },
      { ...mockPR, number: 125, comments: 0, review_comments: 0 },
    ];

    it('should filter by author', () => {
      const filtered = Formatter.filterPullRequests(prs, { author: 'alice' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].user.login).toBe('alice');
    });

    it('should filter by label', () => {
      const filtered = Formatter.filterPullRequests(prs, { label: 'bug' });
      expect(filtered).toHaveLength(3);
    });

    it('should filter by minimum comments', () => {
      const filtered = Formatter.filterPullRequests(prs, { minComments: 5 });
      expect(filtered).toHaveLength(2);
    });

    it('should apply multiple filters', () => {
      const filtered = Formatter.filterPullRequests(prs, {
        author: 'alice',
        minComments: 5,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].user.login).toBe('alice');
    });

    it('should return empty array when no matches', () => {
      const filtered = Formatter.filterPullRequests(prs, { author: 'nonexistent' });
      expect(filtered).toHaveLength(0);
    });
  });

  describe('sortPullRequests', () => {
    const now = Date.now();
    const prs: PullRequest[] = [
      {
        ...mockPR,
        number: 1,
        title: 'Zebra',
        created_at: new Date(now - 3000).toISOString(),
        updated_at: new Date(now - 2000).toISOString(),
        comments: 5,
        review_comments: 0,
      },
      {
        ...mockPR,
        number: 2,
        title: 'Alpha',
        created_at: new Date(now - 1000).toISOString(),
        updated_at: new Date(now - 500).toISOString(),
        comments: 10,
        review_comments: 5,
      },
      {
        ...mockPR,
        number: 3,
        title: 'Beta',
        created_at: new Date(now - 2000).toISOString(),
        updated_at: new Date(now - 1000).toISOString(),
        comments: 2,
        review_comments: 1,
      },
    ];

    it('should sort by created date ascending', () => {
      const sorted = Formatter.sortPullRequests(prs, { field: 'created', direction: 'asc' });
      expect(sorted[0].number).toBe(1);
      expect(sorted[2].number).toBe(2);
    });

    it('should sort by created date descending', () => {
      const sorted = Formatter.sortPullRequests(prs, { field: 'created', direction: 'desc' });
      expect(sorted[0].number).toBe(2);
      expect(sorted[2].number).toBe(1);
    });

    it('should sort by comments', () => {
      const sorted = Formatter.sortPullRequests(prs, { field: 'comments', direction: 'desc' });
      expect(sorted[0].number).toBe(2); // 15 total comments
      expect(sorted[2].number).toBe(3); // 3 total comments
    });

    it('should sort by title', () => {
      const sorted = Formatter.sortPullRequests(prs, { field: 'title', direction: 'asc' });
      expect(sorted[0].title).toBe('Alpha');
      expect(sorted[2].title).toBe('Zebra');
    });

    it('should not mutate original array', () => {
      const original = [...prs];
      Formatter.sortPullRequests(prs, { field: 'created', direction: 'asc' });
      expect(prs).toEqual(original);
    });
  });

  describe('formatRateLimit', () => {
    it('should format rate limit information', () => {
      const reset = new Date('2024-01-01T12:00:00Z');
      const result = Formatter.formatRateLimit(4500, 5000, reset);
      expect(result).toContain('4500/5000');
      expect(result).toContain('API Rate Limit');
      expect(result).toContain('Resets at');
    });

    it('should show different colors based on percentage', () => {
      const reset = new Date();
      const high = Formatter.formatRateLimit(4000, 5000, reset); // 80%
      const medium = Formatter.formatRateLimit(2000, 5000, reset); // 40%
      const low = Formatter.formatRateLimit(500, 5000, reset); // 10%

      expect(high).toBeTruthy();
      expect(medium).toBeTruthy();
      expect(low).toBeTruthy();
    });
  });

  describe('formatCacheStats', () => {
    it('should show empty message for empty cache', () => {
      const result = Formatter.formatCacheStats(0, []);
      expect(result).toContain('Cache is empty');
    });

    it('should format cache statistics', () => {
      const keys = ['owner/repo1:prs-open', 'owner/repo2:prs-open'];
      const result = Formatter.formatCacheStats(2, keys);
      expect(result).toContain('Cache Statistics');
      expect(result).toContain('Total entries: 2');
      expect(result).toContain('owner/repo1:prs-open');
      expect(result).toContain('owner/repo2:prs-open');
    });
  });
});
