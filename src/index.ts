#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as dotenv from 'dotenv';
import { GitHubService } from './services/github.service';
import { CacheService } from './services/cache.service';
import { Formatter } from './utils/formatter';
import { Validator } from './utils/validator';
import { DisplayFormat, FilterOptions, SortOptions } from './types/github.types';

// Load environment variables
dotenv.config();

const program = new Command();

/**
 * Get GitHub token from environment or exit with error
 */
function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error(
      chalk.red.bold('\n✗ Error: GitHub token not found\n') +
        chalk.yellow('Please set GITHUB_TOKEN environment variable.\n') +
        chalk.gray('You can:\n') +
        chalk.gray('  1. Create a .env file with: GITHUB_TOKEN=your_token\n') +
        chalk.gray('  2. Export it: export GITHUB_TOKEN=your_token\n') +
        chalk.gray('  3. Pass it inline: GITHUB_TOKEN=your_token npm start\n\n') +
        chalk.cyan('Generate a token at: https://github.com/settings/tokens\n')
    );
    process.exit(1);
  }

  if (!Validator.isValidTokenFormat(token)) {
    console.error(
      chalk.red.bold('\n✗ Error: Invalid GitHub token format\n') +
        chalk.yellow('Please check your token and try again.\n')
    );
    process.exit(1);
  }

  return token;
}

/**
 * Main command: Fetch and display pull requests
 */
program
  .name('gh-pr-viewer')
  .description('CLI tool to fetch and display GitHub pull requests')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch and display pull requests from a GitHub repository')
  .argument('<repository>', 'Repository in format "owner/repo" (e.g., vercel/next.js)')
  .option('-f, --format <type>', 'Output format: compact, detailed, json', 'compact')
  .option('-s, --state <state>', 'PR state: open, closed, all', 'open')
  .option('--sort <field>', 'Sort by: created, updated, comments, title', 'created')
  .option('--direction <dir>', 'Sort direction: asc, desc', 'desc')
  .option('--author <username>', 'Filter by author username')
  .option('--label <name>', 'Filter by label name')
  .option('--min-comments <number>', 'Filter by minimum number of comments')
  .option('--max-pages <number>', 'Maximum pages to fetch', '5')
  .option('--per-page <number>', 'Results per page', '30')
  .action(async (repository: string, options) => {
    const spinner = ora('Initializing...').start();

    try {
      // Validate repository format
      const repoData = Validator.parseRepo(repository);
      if (!repoData) {
        spinner.fail(
          chalk.red('Invalid repository format. Use: owner/repo (e.g., vercel/next.js)')
        );
        process.exit(1);
      }

      // Validate options
      if (!Validator.isValidDisplayFormat(options.format)) {
        spinner.fail(chalk.red('Invalid format. Use: compact, detailed, or json'));
        process.exit(1);
      }

      if (options.sort && !Validator.isValidSortField(options.sort)) {
        spinner.fail(chalk.red('Invalid sort field. Use: created, updated, comments, or title'));
        process.exit(1);
      }

      if (options.direction && !Validator.isValidSortDirection(options.direction)) {
        spinner.fail(chalk.red('Invalid sort direction. Use: asc or desc'));
        process.exit(1);
      }

      // Get GitHub token and initialize service
      const token = getGitHubToken();
      spinner.text = 'Connecting to GitHub...';

      const githubService = new GitHubService(token);

      // Verify token
      spinner.text = 'Verifying credentials...';
      const isValid = await githubService.verifyToken();
      if (!isValid) {
        spinner.fail(chalk.red('Authentication failed. Please check your GitHub token.'));
        process.exit(1);
      }

      // Fetch pull requests
      spinner.text = `Fetching pull requests from ${chalk.cyan(repository)}...`;
      const { prs, pagination } = await githubService.fetchPullRequests({
        owner: repoData.owner,
        repo: repoData.repo,
        state: options.state as 'open' | 'closed' | 'all',
        perPage: parseInt(options.perPage, 10),
        maxPages: parseInt(options.maxPages, 10),
      });

      spinner.succeed(chalk.green(`Fetched ${prs.length} pull request(s)`));

      // Apply filters
      let filtered = prs;
      const filterOptions: FilterOptions = {};

      if (options.author) {
        filterOptions.author = options.author;
      }
      if (options.label) {
        filterOptions.label = options.label;
      }
      if (options.minComments) {
        filterOptions.minComments = parseInt(options.minComments, 10);
      }

      if (Object.keys(filterOptions).length > 0) {
        filtered = Formatter.filterPullRequests(prs, filterOptions);
        console.log(
          chalk.gray(`\nFilters applied: ${filtered.length} of ${prs.length} PRs match criteria`)
        );
      }

      // Apply sorting
      const sortOptions: SortOptions = {
        field: options.sort || 'created',
        direction: options.direction || 'desc',
      };
      filtered = Formatter.sortPullRequests(filtered, sortOptions);

      // Display results
      const formatted = Formatter.formatPullRequests(filtered, options.format as DisplayFormat);
      console.log(formatted);

      // Show pagination info
      if (pagination.hasNextPage) {
        console.log(
          chalk.yellow(
            `\n⚠ More results available. Increase --max-pages to fetch additional pages.`
          )
        );
      }
    } catch (error) {
      spinner.fail(chalk.red('Error fetching pull requests'));
      if (error instanceof Error) {
        console.error(chalk.red(`\n${error.message}\n`));
      } else {
        console.error(chalk.red('\nAn unexpected error occurred\n'));
      }
      process.exit(1);
    }
  });

/**
 * Cache command: Manage cache
 */
program
  .command('cache')
  .description('Manage cache')
  .option('-c, --clear', 'Clear all cached data')
  .option('-s, --stats', 'Show cache statistics')
  .action((options) => {
    const cache = CacheService.getInstance();

    if (options.clear) {
      cache.clear();
      console.log(chalk.green('✓ Cache cleared successfully'));
      return;
    }

    if (options.stats) {
      const stats = cache.getStats();
      console.log(Formatter.formatCacheStats(stats.size, stats.keys));
      return;
    }

    // Default: show stats
    const stats = cache.getStats();
    console.log(Formatter.formatCacheStats(stats.size, stats.keys));
  });

/**
 * Rate limit command: Check API rate limit
 */
program
  .command('rate-limit')
  .description('Check GitHub API rate limit status')
  .action(async () => {
    const spinner = ora('Checking rate limit...').start();

    try {
      const token = getGitHubToken();
      const githubService = new GitHubService(token);

      const rateLimit = await githubService.getRateLimit();
      spinner.stop();

      console.log(Formatter.formatRateLimit(rateLimit.remaining, rateLimit.limit, rateLimit.reset));
    } catch (error) {
      spinner.fail(chalk.red('Error checking rate limit'));
      if (error instanceof Error) {
        console.error(chalk.red(`\n${error.message}\n`));
      }
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
