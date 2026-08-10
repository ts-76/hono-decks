declare module "@semantic-release/commit-analyzer" {
  interface CommitAnalyzerOptions {
    preset?: string;
    releaseRules?: Array<Record<string, string | boolean>>;
  }

  interface CommitAnalyzerContext {
    commits: Array<{ message: string }>;
    logger: { log: (...args: unknown[]) => void };
  }

  export function analyzeCommits(
    options: CommitAnalyzerOptions,
    context: CommitAnalyzerContext,
  ): Promise<string | null>;
}

declare module "semver" {
  type ReleaseType = "major" | "minor" | "patch";

  const semver: {
    inc(version: string, release: ReleaseType): string | null;
  };

  export default semver;
}
