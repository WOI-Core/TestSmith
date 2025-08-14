export type TagFilter = 'all' | 'tagged' | 'untagged';

export interface Problem {
  id: string;
  name: string;
  difficulty: number;
  tags: string[];
  is_tagged: boolean;
  embedding: number[] | null;
  isTagging?: boolean;
  isDeleting?: boolean;
}

export function getFilterStats(problems: Problem[]) {
  const total = problems.length;
  const tagged = problems.filter(p => p.is_tagged).length;
  const untagged = total - tagged;
  return { total, tagged, untagged };
}

export function filterProblems(
  problems: Problem[],
  searchTerm: string,
  tagFilter: TagFilter
): Problem[] {
  const lowercasedSearchTerm = searchTerm.toLowerCase();

  return problems.filter(problem => {
    if (tagFilter === 'tagged' && !problem.is_tagged) {
      return false;
    }
    if (tagFilter === 'untagged' && problem.is_tagged) {
      return false;
    }

    if (lowercasedSearchTerm) {
      const matchesName = problem.name.toLowerCase().includes(lowercasedSearchTerm);
      const matchesId = problem.id.toLowerCase().includes(lowercasedSearchTerm);
      const matchesTags = problem.tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm));
      if (!(matchesName || matchesId || matchesTags)) {
        return false;
      }
    }

    return true;
  });
}

export function getFilterDescription(
  totalProblems: number,
  filteredCount: number,
  searchTerm: string,
  tagFilter: TagFilter
): string {
  if (totalProblems === 0) {
    return "No problems found in storage.";
  }

  let description = `Showing ${filteredCount} of ${totalProblems} problems.`;

  const filterParts: string[] = [];
  if (tagFilter !== 'all') {
    filterParts.push(`status is "${tagFilter}"`);
  }
  if (searchTerm) {
    filterParts.push(`query is "${searchTerm}"`);
  }

  if (filterParts.length > 0) {
    description += ` (Filter: ${filterParts.join(' and ')})`;
  }

  return description;
} 