import chalk from 'chalk';
import { PullRequest, DisplayFormat, FilterOptions, SortOptions } from '../types/github.types';

/**
 * Formatter utility for displaying pull requests in various formats
 */
export class Formatter {
  /**
   * Format pull requests for display
   * @param prs - Array of pull requests
   * @param format - Display format (compact, detailed, json)
   * @returns Formatted string
   */
  static formatPullRequests(prs: PullRequest[], format: DisplayFormat): string {
    if (prs.length === 0) {
      return chalk.yellow('No pull requests found.');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(prs, null, 2);
      case 'detailed':
        return this.formatDetailed(prs);
      case 'compact':
      default:
        return this.formatCompact(prs);
    }
  }

  /**
   * Format pull requests in compact view
   */
  private static formatCompact(prs: PullRequest[]): string {
    const lines: string[] = [];

    lines.push(chalk.bold.cyan(`\n📋 Found ${prs.length} pull request(s):\n`));

    prs.forEach((pr, index) => {
      const number = chalk.blue(`#${pr.number}`);
      const title = chalk.white(pr.title);
      const author = chalk.green(`@${pr.user.login}`);
      const date = chalk.gray(this.formatDate(pr.created_at));
      const status = pr.draft ? chalk.yellow('[DRAFT]') : '';
      const comments = pr.comments + pr.review_comments;
      const commentBadge = comments > 0 ? chalk.magenta(`💬 ${comments}`) : '';

      lines.push(
        `${chalk.gray(`${index + 1}.`)} ${number} ${title} ${status}\n   ${author} • ${date} ${commentBadge}`
      );
    });

    return lines.join('\n');
  }

  /**
   * Format pull requests in detailed view
   */
  private static formatDetailed(prs: PullRequest[]): string {
    const lines: string[] = [];

    lines.push(chalk.bold.cyan(`\n📋 Found ${prs.length} pull request(s):\n`));

    prs.forEach((pr, index) => {
      lines.push(chalk.bold(`${index + 1}. PR #${pr.number}: ${pr.title}`));
      lines.push(chalk.gray('─'.repeat(80)));

      // Basic info
      lines.push(`${chalk.bold('Author:')} ${chalk.green(pr.user.login)}`);
      lines.push(`${chalk.bold('Created:')} ${this.formatDate(pr.created_at)}`);
      lines.push(`${chalk.bold('Updated:')} ${this.formatDate(pr.updated_at)}`);
      lines.push(`${chalk.bold('Status:')} ${this.formatStatus(pr)}`);
      lines.push(`${chalk.bold('URL:')} ${chalk.cyan(pr.html_url)}`);

      // Stats
      const stats = [
        `💬 ${pr.comments + pr.review_comments} comments`,
        `📝 ${pr.commits} commits`,
        `+${pr.additions} -${pr.deletions}`,
        `${pr.changed_files} files`,
      ];
      lines.push(`${chalk.bold('Stats:')} ${stats.join(' • ')}`);

      // Labels
      if (pr.labels.length > 0) {
        const labels = pr.labels
          .map((label) => chalk.hex(`#${label.color}`)(label.name))
          .join(', ');
        lines.push(`${chalk.bold('Labels:')} ${labels}`);
      }

      // Reviewers
      if (pr.requested_reviewers.length > 0) {
        const reviewers = pr.requested_reviewers.map((r) => `@${r.login}`).join(', ');
        lines.push(`${chalk.bold('Reviewers:')} ${chalk.green(reviewers)}`);
      }

      // Body preview
      if (pr.body) {
        const preview = pr.body.substring(0, 150).replace(/\n/g, ' ');
        lines.push(
          `${chalk.bold('Description:')} ${chalk.gray(preview)}${pr.body.length > 150 ? '...' : ''}`
        );
      }

      lines.push(''); // Empty line between PRs
    });

    return lines.join('\n');
  }

  /**
   * Format PR status with color coding
   */
  private static formatStatus(pr: PullRequest): string {
    if (pr.merged_at) {
      return chalk.magenta('✓ Merged');
    }
    if (pr.closed_at) {
      return chalk.red('✗ Closed');
    }
    if (pr.draft) {
      return chalk.yellow('○ Draft');
    }
    return chalk.green('○ Open');
  }

  /**
   * Format date to human-readable string
   */
  private static formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Filter pull requests based on criteria
   */
  static filterPullRequests(prs: PullRequest[], options: FilterOptions): PullRequest[] {
    let filtered = [...prs];

    if (options.author) {
      filtered = filtered.filter(
        (pr) => pr.user.login.toLowerCase() === options.author?.toLowerCase()
      );
    }

    if (options.label) {
      filtered = filtered.filter((pr) =>
        pr.labels.some((label) => label.name.toLowerCase() === options.label?.toLowerCase())
      );
    }

    if (options.minComments !== undefined) {
      filtered = filtered.filter((pr) => pr.comments + pr.review_comments >= options.minComments!);
    }

    return filtered;
  }

  /**
   * Sort pull requests based on criteria
   */
  static sortPullRequests(prs: PullRequest[], options: SortOptions): PullRequest[] {
    const sorted = [...prs];

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (options.field) {
        case 'created':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
          compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'comments':
          compareValue = a.comments + a.review_comments - (b.comments + b.review_comments);
          break;
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
      }

      return options.direction === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }

  /**
   * Format rate limit information
   */
  static formatRateLimit(remaining: number, limit: number, reset: Date): string {
    const percentage = (remaining / limit) * 100;
    const color = percentage > 50 ? chalk.green : percentage > 20 ? chalk.yellow : chalk.red;

    return (
      `\n${chalk.bold('API Rate Limit:')}\n` +
      `  ${color(`${remaining}/${limit}`)} requests remaining\n` +
      `  Resets at: ${reset.toLocaleTimeString()}\n`
    );
  }

  /**
   * Format cache statistics
   */
  static formatCacheStats(size: number, keys: string[]): string {
    if (size === 0) {
      return chalk.yellow('Cache is empty');
    }

    return (
      `\n${chalk.bold.cyan('Cache Statistics:')}\n` +
      `  Total entries: ${chalk.green(size)}\n` +
      `  Cached repositories:\n` +
      keys.map((key) => `    • ${chalk.gray(key)}`).join('\n')
    );
  }
}
