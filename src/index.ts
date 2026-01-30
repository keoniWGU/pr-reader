#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
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
 * Interactive mode: Prompt user for options
 */
async function runInteractiveMode(): Promise<void> {
  console.log(chalk.bold.cyan('\n🔍 GitHub PR Viewer - Interactive Mode\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'repository',
      message: 'Enter repository (owner/repo):',
      default: 'vercel/next.js',
      validate: (input: string) => {
        if (!Validator.isValidRepoFormat(input)) {
          return 'Please enter a valid repository format (e.g., owner/repo)';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'format',
      message: 'Choose display format:',
      choices: [
        { name: 'Compact (default)', value: 'compact' },
        { name: 'Detailed', value: 'detailed' },
        { name: 'JSON', value: 'json' },
      ],
      default: 'compact',
    },
    {
      type: 'list',
      name: 'state',
      message: 'PR state:',
      choices: [
        { name: 'Open (default)', value: 'open' },
        { name: 'Closed', value: 'closed' },
        { name: 'All', value: 'all' },
      ],
      default: 'open',
    },
    {
      type: 'list',
      name: 'sortField',
      message: 'Sort by:',
      choices: [
        { name: 'Created date (default)', value: 'created' },
        { name: 'Updated date', value: 'updated' },
        { name: 'Comments', value: 'comments' },
        { name: 'Title', value: 'title' },
      ],
      default: 'created',
    },
    {
      type: 'list',
      name: 'sortDirection',
      message: 'Sort direction:',
      choices: [
        { name: 'Descending (newest first)', value: 'desc' },
        { name: 'Ascending (oldest first)', value: 'asc' },
      ],
      default: 'desc',
    },
    {
      type: 'confirm',
      name: 'useFilters',
      message: 'Would you like to apply filters?',
      default: false,
    },
  ]);

  const filterOptions: FilterOptions = {};

  if (answers.useFilters) {
    const filterAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'author',
        message: 'Filter by author username (leave empty to skip):',
      },
      {
        type: 'input',
        name: 'label',
        message: 'Filter by label (leave empty to skip):',
      },
      {
        type: 'number',
        name: 'minComments',
        message: 'Minimum number of comments (0 to skip):',
        default: 0,
      },
    ]);

    if (filterAnswers.author) filterOptions.author = filterAnswers.author;
    if (filterAnswers.label) filterOptions.label = filterAnswers.label;
    if (filterAnswers.minComments > 0) filterOptions.minComments = filterAnswers.minComments;
  }

  const spinner = ora('Initializing...').start();

  try {
    const repoData = Validator.parseRepo(answers.repository);
    if (!repoData) {
      spinner.fail(chalk.red('Invalid repository format'));
      process.exit(1);
    }

    const token = getGitHubToken();
    spinner.text = 'Connecting to GitHub...';

    const githubService = new GitHubService(token);

    spinner.text = 'Verifying credentials...';
    const isValid = await githubService.verifyToken();
    if (!isValid) {
      spinner.fail(chalk.red('Authentication failed. Please check your GitHub token.'));
      process.exit(1);
    }

    spinner.text = `Fetching pull requests from ${chalk.cyan(answers.repository)}...`;
    const { prs, pagination } = await githubService.fetchPullRequests({
      owner: repoData.owner,
      repo: repoData.repo,
      state: answers.state as 'open' | 'closed' | 'all',
      perPage: 30,
      maxPages: 5,
    });

    spinner.succeed(chalk.green(`Fetched ${prs.length} pull request(s)`));

    let filtered = prs;

    if (Object.keys(filterOptions).length > 0) {
      filtered = Formatter.filterPullRequests(prs, filterOptions);
      console.log(
        chalk.gray(`\nFilters applied: ${filtered.length} of ${prs.length} PRs match criteria`)
      );
    }

    const sortOptions: SortOptions = {
      field: answers.sortField,
      direction: answers.sortDirection,
    };
    filtered = Formatter.sortPullRequests(filtered, sortOptions);

    const formatted = Formatter.formatPullRequests(filtered, answers.format as DisplayFormat);
    console.log(formatted);

    if (pagination.hasNextPage) {
      console.log(
        chalk.yellow(
          `\n⚠ More results available. Use CLI options with --max-pages to fetch additional pages.`
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
}

/**
 * Main command: Fetch and display pull requests
 */
program
  .name('gh-pr-viewer')
  .description('CLI tool to fetch and display GitHub pull requests')
  .version('1.0.0');

// Interactive mode (default when no arguments)
program
  .command('interactive', { isDefault: true })
  .alias('i')
  .description('Run in interactive mode (default)')
  .action(async () => {
    await runInteractiveMode();
  });

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
  runInteractiveMode().catch((error) => {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  });
}
