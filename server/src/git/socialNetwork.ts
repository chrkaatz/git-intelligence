import simpleGit from 'simple-git';
import { getRepositories } from '../db';
import { normalizeEmail } from './utils';
import type {
  SocialNetworkAnalysis,
  CollaborationGraph,
  CollaborationNode,
  CollaborationEdge,
  KnowledgeSilo,
  OrphanedCode,
  CrossRepoSocialNetworkAnalysis,
  CrossRepoCollaboration,
  RepoCluster,
} from './types';

export async function getSocialNetworkAnalysis(
  repoPath: string,
  useCache: boolean = true
): Promise<SocialNetworkAnalysis> {
  console.log(`Calculating social network analysis for ${repoPath}`);
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Get all commits with file changes and author info
    const numstatRaw = await git.raw([
      'log',
      '--all',
      '--numstat',
      '--pretty=format:%H|%an|%ae|%ad',
      '--date=iso',
    ]);

    // Track which authors worked on which files
    // Map: file -> Set<authorEmail>
    const fileAuthors = new Map<string, Set<string>>();
    // Map: file -> Map<authorEmail, { name: string, commits: number, lastCommit: Date }>
    const fileAuthorDetails = new Map<
      string,
      Map<string, { name: string; commits: number; lastCommit: Date }>
    >();
    // Map: authorEmail -> { name: string, files: Set<string> }
    const authorFiles = new Map<string, { name: string; files: Set<string> }>();
    // Map: file -> lastCommitDate
    const fileLastCommit = new Map<string, Date>();

    const lines = numstatRaw.split('\n');
    let currentCommit: { hash: string; authorName: string; authorEmail: string; date: Date } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this is a commit header line (hash|name|email|date)
      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)$/);
      if (commitMatch) {
        const [, hash, authorName, authorEmail, dateStr] = commitMatch;
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            const dateFixed = new Date(dateStr.replace(' ', 'T'));
            if (isNaN(dateFixed.getTime())) continue;
            currentCommit = { hash, authorName, authorEmail, date: dateFixed };
          } else {
            currentCommit = { hash, authorName, authorEmail, date };
          }
        } catch {
          continue;
        }
        continue;
      }

      // Check if this is a numstat line (added\tdeleted\tfile)
      if (currentCommit && line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const filePath = parts.slice(2).join('\t');
          if (filePath) {
            const normalizedEmail = normalizeEmail(currentCommit.authorEmail);

            // Track file authors
            if (!fileAuthors.has(filePath)) {
              fileAuthors.set(filePath, new Set());
              fileAuthorDetails.set(filePath, new Map());
            }
            fileAuthors.get(filePath)!.add(normalizedEmail);
            fileLastCommit.set(filePath, currentCommit.date);

            // Track author details per file
            const authorDetails = fileAuthorDetails.get(filePath)!;
            if (!authorDetails.has(normalizedEmail)) {
              authorDetails.set(normalizedEmail, {
                name: currentCommit.authorName,
                commits: 0,
                lastCommit: currentCommit.date,
              });
            }
            const details = authorDetails.get(normalizedEmail)!;
            details.commits++;
            if (currentCommit.date > details.lastCommit) {
              details.lastCommit = currentCommit.date;
            }

            // Track author files
            if (!authorFiles.has(normalizedEmail)) {
              authorFiles.set(normalizedEmail, {
                name: currentCommit.authorName,
                files: new Set(),
              });
            }
            authorFiles.get(normalizedEmail)!.files.add(filePath);
          }
        }
      }
    }

    // Build collaboration graph
    // Edges: authors who worked on the same files
    const collaborationMap = new Map<string, Map<string, Set<string>>>(); // author1 -> author2 -> shared files
    const authorNames = new Map<string, string>(); // email -> name

    for (const [file, authors] of fileAuthors.entries()) {
      const authorArray = Array.from(authors);
      for (let i = 0; i < authorArray.length; i++) {
        const author1 = authorArray[i];
        const author1Details = fileAuthorDetails.get(file)!.get(author1)!;
        authorNames.set(author1, author1Details.name);

        for (let j = i + 1; j < authorArray.length; j++) {
          const author2 = authorArray[j];
          const author2Details = fileAuthorDetails.get(file)!.get(author2)!;
          authorNames.set(author2, author2Details.name);

          // Ensure both directions are tracked
          if (!collaborationMap.has(author1)) {
            collaborationMap.set(author1, new Map());
          }
          if (!collaborationMap.has(author2)) {
            collaborationMap.set(author2, new Map());
          }

          const collab1 = collaborationMap.get(author1)!;
          const collab2 = collaborationMap.get(author2)!;

          if (!collab1.has(author2)) {
            collab1.set(author2, new Set());
          }
          if (!collab2.has(author1)) {
            collab2.set(author1, new Set());
          }

          collab1.get(author2)!.add(file);
          collab2.get(author1)!.add(file);
        }
      }
    }

    // Convert to edges array
    const edges: CollaborationEdge[] = [];
    const processedPairs = new Set<string>();

    for (const [author1, collaborators] of collaborationMap.entries()) {
      for (const [author2, sharedFiles] of collaborators.entries()) {
        // Create a unique key for the pair (sorted)
        const pairKey = [author1, author2].sort().join('|');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const sharedFilesList = Array.from(sharedFiles);
        // Normalize collaboration strength (0-1) based on number of shared files
        // Using a logarithmic scale to prevent outliers from dominating
        const maxSharedFiles = Math.max(...Array.from(collaborationMap.values()).flatMap(m => Array.from(m.values()).map(s => s.size)));
        const collaborationStrength = maxSharedFiles > 0
          ? Math.min(1, Math.log(sharedFilesList.length + 1) / Math.log(maxSharedFiles + 1))
          : 0;

        edges.push({
          author1: authorNames.get(author1) || author1,
          author1Email: author1,
          author2: authorNames.get(author2) || author2,
          author2Email: author2,
          sharedFiles: sharedFilesList.length,
          sharedFilesList: sharedFilesList.slice(0, 10), // Limit to first 10 for display
          collaborationStrength,
        });
      }
    }

    // Build nodes
    const nodes: CollaborationNode[] = Array.from(authorFiles.entries()).map(([email, data]) => {
      const degree = edges.filter(
        e => e.author1Email === email || e.author2Email === email
      ).length;
      const totalSharedFiles = edges
        .filter(e => e.author1Email === email || e.author2Email === email)
        .reduce((sum, e) => sum + e.sharedFiles, 0);

      return {
        author: data.name,
        authorEmail: email,
        degree,
        totalSharedFiles,
      };
    });

    // Simple clustering: find connected components
    const clusters: CollaborationGraph['clusters'] = [];
    const visited = new Set<string>();
    let clusterId = 0;

    const dfs = (email: string, cluster: string[]) => {
      if (visited.has(email)) return;
      visited.add(email);
      cluster.push(email);

      // Find all connected authors
      for (const edge of edges) {
        if (edge.author1Email === email && !visited.has(edge.author2Email)) {
          dfs(edge.author2Email, cluster);
        } else if (edge.author2Email === email && !visited.has(edge.author1Email)) {
          dfs(edge.author1Email, cluster);
        }
      }
    };

    for (const [email] of authorFiles.entries()) {
      if (!visited.has(email)) {
        const cluster: string[] = [];
        dfs(email, cluster);
        if (cluster.length > 1) {
          // Only include clusters with more than one author
          clusters.push({
            clusterId: clusterId++,
            authors: cluster.map(e => authorNames.get(e) || e),
            authorEmails: cluster,
            size: cluster.length,
          });
        }
      }
    }

    // Identify knowledge silos (files touched by 1-2 people)
    const knowledgeSilos: KnowledgeSilo[] = [];
    const now = new Date();

    for (const [file, authors] of fileAuthors.entries()) {
      if (authors.size <= 2) {
        const authorDetails = fileAuthorDetails.get(file)!;
        const authorList = Array.from(authors).map(email => ({
          name: authorDetails.get(email)!.name,
          email,
        }));

        const lastCommit = fileLastCommit.get(file)!;
        const daysSinceLastCommit = Math.floor((now.getTime() - lastCommit.getTime()) / (1000 * 60 * 60 * 24));

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (authors.size === 1) {
          riskLevel = daysSinceLastCommit > 365 ? 'high' : daysSinceLastCommit > 180 ? 'medium' : 'low';
        } else if (authors.size === 2) {
          riskLevel = daysSinceLastCommit > 365 ? 'medium' : 'low';
        }

        const totalCommits = Array.from(authorDetails.values()).reduce((sum, d) => sum + d.commits, 0);

        knowledgeSilos.push({
          file,
          authorCount: authors.size,
          authors: authorList.map(a => a.name),
          authorEmails: authorList.map(a => a.email),
          totalCommits,
          lastCommitDate: lastCommit.toISOString(),
          daysSinceLastCommit,
          riskLevel,
        });
      }
    }

    // Identify orphaned code (files not touched in years)
    const orphanedCode: OrphanedCode[] = [];
    const orphanThresholdDays = 365 * 2; // 2 years

    for (const [file, lastCommit] of fileLastCommit.entries()) {
      const daysSinceLastCommit = Math.floor((now.getTime() - lastCommit.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastCommit >= orphanThresholdDays) {
        const authorDetails = fileAuthorDetails.get(file)!;
        const lastAuthorDetails = Array.from(authorDetails.values()).sort((a, b) =>
          b.lastCommit.getTime() - a.lastCommit.getTime()
        )[0];

        const totalCommits = Array.from(authorDetails.values()).reduce((sum, d) => sum + d.commits, 0);

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (daysSinceLastCommit > 365 * 3) {
          riskLevel = 'high';
        } else if (daysSinceLastCommit > 365 * 2) {
          riskLevel = 'medium';
        }

        orphanedCode.push({
          file,
          lastCommitDate: lastCommit.toISOString(),
          daysSinceLastCommit,
          lastAuthor: lastAuthorDetails.name,
          lastAuthorEmail: Array.from(authorDetails.keys()).find(e =>
            authorDetails.get(e)!.name === lastAuthorDetails.name
          ) || '',
          totalCommits,
          riskLevel,
        });
      }
    }

    // Sort results
    knowledgeSilos.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return b.daysSinceLastCommit - a.daysSinceLastCommit;
    });

    orphanedCode.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return b.daysSinceLastCommit - a.daysSinceLastCommit;
    });

    edges.sort((a, b) => b.sharedFiles - a.sharedFiles);
    nodes.sort((a, b) => b.degree - a.degree);

    return {
      collaborationGraph: {
        nodes,
        edges,
        clusters,
      },
      knowledgeSilos: knowledgeSilos.slice(0, 100), // Limit to top 100
      orphanedCode: orphanedCode.slice(0, 100), // Limit to top 100
    };
  } catch (error) {
    console.error('Social network analysis error:', error);
    throw error;
  }
}

export async function getCrossRepoSocialNetworkAnalysis(
  projectId: string,
  useCache: boolean = true
): Promise<CrossRepoSocialNetworkAnalysis> {
  console.log(`Calculating cross-repo social network analysis for project ${projectId}`);

  const repositories = await getRepositories(projectId);
  if (repositories.length === 0) {
    return {
      crossRepoCollaboration: [],
      repoClusters: [],
      totalRepos: 0,
      repoNames: [],
    };
  }

  // Track which authors work in which repos
  // Map: authorEmail -> Set<repoPath>
  const authorRepos = new Map<string, Set<string>>();
  // Map: authorEmail -> { name: string, repos: Map<repoPath, { repoName: string, commits: number }> }
  const authorRepoDetails = new Map<
    string,
    {
      name: string;
      repos: Map<string, { repoName: string; commits: number }>;
    }
  >();
  // Map: repoPath -> { repoName: string, authors: Set<authorEmail> }
  const repoAuthors = new Map<
    string,
    { repoName: string; authors: Set<string> }
  >();

  // Analyze each repository
  for (const repo of repositories) {
    const git = simpleGit(repo.path);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) continue;

    try {
      const numstatRaw = await git.raw([
        'log',
        '--all',
        '--numstat',
        '--pretty=format:%H|%an|%ae|%ad',
        '--date=iso',
      ]);

      const lines = numstatRaw.split('\n');
      let currentCommit: { hash: string; authorName: string; authorEmail: string; date: Date } | null = null;
      const repoAuthorCommits = new Map<string, number>(); // authorEmail -> commits

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)$/);
        if (commitMatch) {
          const [, hash, authorName, authorEmail, dateStr] = commitMatch;
          try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              const dateFixed = new Date(dateStr.replace(' ', 'T'));
              if (isNaN(dateFixed.getTime())) continue;
              currentCommit = { hash, authorName, authorEmail, date: dateFixed };
            } else {
              currentCommit = { hash, authorName, authorEmail, date };
            }
          } catch {
            continue;
          }

          const normalizedEmail = normalizeEmail(authorEmail);
          repoAuthorCommits.set(normalizedEmail, (repoAuthorCommits.get(normalizedEmail) || 0) + 1);

          // Track author repos
          if (!authorRepos.has(normalizedEmail)) {
            authorRepos.set(normalizedEmail, new Set());
            authorRepoDetails.set(normalizedEmail, {
              name: authorName,
              repos: new Map(),
            });
          }
          authorRepos.get(normalizedEmail)!.add(repo.path);

          const details = authorRepoDetails.get(normalizedEmail)!;
          if (!details.repos.has(repo.path)) {
            details.repos.set(repo.path, { repoName: repo.name, commits: 0 });
          }
          // Update commit count at the end of processing this repo

          // Track repo authors
          if (!repoAuthors.has(repo.path)) {
            repoAuthors.set(repo.path, { repoName: repo.name, authors: new Set() });
          }
          repoAuthors.get(repo.path)!.authors.add(normalizedEmail);
        }
      }

      // Update commit counts for all authors in this repo
      for (const [email, commitCount] of repoAuthorCommits.entries()) {
        const details = authorRepoDetails.get(email);
        if (details && details.repos.has(repo.path)) {
          details.repos.get(repo.path)!.commits = commitCount;
        }
      }
    } catch (error) {
      console.error(`Error analyzing repo ${repo.path}:`, error);
      continue;
    }
  }

  // Build cross-repo collaboration graph
  // Find authors who work in multiple repos
  const crossRepoCollaboration: CrossRepoCollaboration[] = [];
  const processedPairs = new Set<string>();

  const authorArray = Array.from(authorRepos.entries());
  for (let i = 0; i < authorArray.length; i++) {
    const [author1Email, repos1] = authorArray[i];
    const author1Details = authorRepoDetails.get(author1Email)!;

    for (let j = i + 1; j < authorArray.length; j++) {
      const [author2Email, repos2] = authorArray[j];
      const author2Details = authorRepoDetails.get(author2Email)!;

      // Find shared repos
      const sharedRepos = Array.from(repos1).filter(r => repos2.has(r));
      if (sharedRepos.length > 0) {
        const pairKey = [author1Email, author2Email].sort().join('|');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const sharedRepoNames = sharedRepos.map(path => {
          const repo = repositories.find(r => r.path === path);
          return repo ? repo.name : path;
        });

        // Normalize collaboration strength
        const maxSharedRepos = Math.max(
          ...Array.from(authorRepos.values()).map(r => r.size)
        );
        const collaborationStrength = maxSharedRepos > 0
          ? Math.min(1, Math.log(sharedRepos.length + 1) / Math.log(maxSharedRepos + 1))
          : 0;

        crossRepoCollaboration.push({
          author1: author1Details.name,
          author1Email,
          author2: author2Details.name,
          author2Email,
          sharedRepos: sharedRepoNames,
          sharedReposCount: sharedRepos.length,
          collaborationStrength,
        });
      }
    }
  }

  // Build repo clusters (repos worked on by same authors)
  const repoClusters: RepoCluster[] = [];
  const processedRepos = new Set<string>();

  // Group repos by their author sets
  const repoGroups = new Map<string, string[]>(); // authorSetKey -> repoPaths

  for (const [repoPath, repoData] of repoAuthors.entries()) {
    // Create a key from sorted author emails
    const authorSetKey = Array.from(repoData.authors).sort().join('|');
    if (!repoGroups.has(authorSetKey)) {
      repoGroups.set(authorSetKey, []);
    }
    repoGroups.get(authorSetKey)!.push(repoPath);
  }

  // Convert groups to clusters
  let clusterId = 0;
  for (const [authorSetKey, repoPaths] of repoGroups.entries()) {
    if (repoPaths.length > 1) {
      // Only include clusters with more than one repo
      const authors = authorSetKey.split('|');
      const authorNames = authors.map(email => {
        const details = authorRepoDetails.get(email);
        return details ? details.name : email;
      });

      repoClusters.push({
        clusterId: clusterId++,
        repos: repoPaths.map(path => {
          const repo = repositories.find(r => r.path === path);
          return repo ? repo.name : path;
        }),
        repoPaths,
        authors: authorNames,
        authorEmails: authors,
        size: repoPaths.length,
      });
    }
  }

  // Sort results
  crossRepoCollaboration.sort((a, b) => b.sharedReposCount - a.sharedReposCount);
  repoClusters.sort((a, b) => b.size - a.size);

  return {
    crossRepoCollaboration: crossRepoCollaboration.slice(0, 100), // Limit to top 100
    repoClusters,
    totalRepos: repositories.length,
    repoNames: repositories.map(r => r.name),
  };
}

