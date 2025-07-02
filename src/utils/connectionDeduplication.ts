import { Connection, Account } from '../types/accounts';

export interface DuplicateInfo {
  connectionId: number;
  duplicateType: 'exact' | 'similar_accounts' | 'same_connector';
  duplicateWith: number[];
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects potential duplicate connections based on various criteria
 */
export const detectDuplicateConnections = (
  connections: Connection[],
  accounts: Account[]
): DuplicateInfo[] => {
  const duplicates: DuplicateInfo[] = [];
  const processed = new Set<number>();

  // Group accounts by connection ID for quick lookup
  const accountsByConnection = new Map<number, Account[]>();
  accounts.forEach(account => {
    if (!accountsByConnection.has(account.id_connection)) {
      accountsByConnection.set(account.id_connection, []);
    }
    accountsByConnection.get(account.id_connection)!.push(account);
  });

  for (let i = 0; i < connections.length; i++) {
    const conn1 = connections[i];

    if (processed.has(conn1.id)) continue;

    const duplicateWith: number[] = [];
    let duplicateType: DuplicateInfo['duplicateType'] = 'similar_accounts';
    let reason = '';
    let confidence: DuplicateInfo['confidence'] = 'low';

    for (let j = i + 1; j < connections.length; j++) {
      const conn2 = connections[j];

      if (processed.has(conn2.id)) continue;

      // Check for exact duplicates (same connector UUID)
      if (conn1.connector_uuid === conn2.connector_uuid) {
        duplicateWith.push(conn2.id);
        duplicateType = 'exact';
        reason = 'Même UUID de connecteur';
        confidence = 'high';
        continue;
      }

      // Check for same connector ID
      if (conn1.id_connector === conn2.id_connector) {
        duplicateWith.push(conn2.id);
        duplicateType = 'same_connector';
        reason = 'Même ID de connecteur';
        confidence = 'medium';
        continue;
      }

      // Check for similar accounts (same IBAN or account numbers)
      const accounts1 = accountsByConnection.get(conn1.id) || [];
      const accounts2 = accountsByConnection.get(conn2.id) || [];

      const similarity = calculateAccountSimilarity(accounts1, accounts2);

      if (similarity.score > 0.7) {
        duplicateWith.push(conn2.id);
        duplicateType = 'similar_accounts';
        reason = `Comptes similaires: ${similarity.matchingAccounts} compte(s) en commun`;
        confidence = similarity.score > 0.9 ? 'high' : 'medium';
      }
    }

    if (duplicateWith.length > 0) {
      duplicates.push({
        connectionId: conn1.id,
        duplicateType,
        duplicateWith,
        reason,
        confidence,
      });

      // Mark all related connections as processed
      processed.add(conn1.id);
      duplicateWith.forEach(id => processed.add(id));
    }
  }

  return duplicates;
};

/**
 * Calculates similarity between two sets of accounts
 */
const calculateAccountSimilarity = (
  accounts1: Account[],
  accounts2: Account[]
): {
  score: number;
  matchingAccounts: number;
} => {
  if (accounts1.length === 0 || accounts2.length === 0) {
    return { score: 0, matchingAccounts: 0 };
  }

  let matchingAccounts = 0;
  let totalComparisons = 0;

  // Create lookup maps for efficient comparison
  const ibans1 = new Set(accounts1.filter(acc => acc.iban).map(acc => acc.iban));
  const numbers1 = new Set(accounts1.map(acc => acc.number));
  const ibans2 = new Set(accounts2.filter(acc => acc.iban).map(acc => acc.iban));
  const numbers2 = new Set(accounts2.map(acc => acc.number));

  // Check IBAN matches (higher weight)
  ibans1.forEach(iban => {
    if (iban && ibans2.has(iban)) {
      matchingAccounts += 2; // IBAN matches are weighted more heavily
    }
  });

  // Check account number matches
  numbers1.forEach(number => {
    if (number && numbers2.has(number)) {
      matchingAccounts += 1;
    }
  });

  // Calculate total possible matches
  totalComparisons = Math.max(accounts1.length, accounts2.length) * 2; // Max possible score

  const score = totalComparisons > 0 ? matchingAccounts / totalComparisons : 0;

  return {
    score: Math.min(score, 1), // Cap at 1.0
    matchingAccounts: Math.floor(matchingAccounts / 2), // Convert back to actual account count
  };
};

/**
 * Groups duplicate connections for better display
 */
export const groupDuplicateConnections = (
  duplicates: DuplicateInfo[]
): Map<number, DuplicateInfo[]> => {
  const groups = new Map<number, DuplicateInfo[]>();
  const processed = new Set<number>();

  duplicates.forEach(dup => {
    if (processed.has(dup.connectionId)) return;

    // Find all connections in this duplicate group
    const group = [dup];
    const allConnections = new Set([dup.connectionId, ...dup.duplicateWith]);

    // Look for other duplicates that involve any connection in this group
    duplicates.forEach(otherDup => {
      if (otherDup.connectionId === dup.connectionId) return;

      const otherConnections = new Set([otherDup.connectionId, ...otherDup.duplicateWith]);

      // Check if there's any overlap
      const hasOverlap = [...allConnections].some(id => otherConnections.has(id));

      if (hasOverlap) {
        group.push(otherDup);
        otherConnections.forEach(id => allConnections.add(id));
      }
    });

    // Use the lowest connection ID as the group key
    const groupKey = Math.min(...allConnections);
    groups.set(groupKey, group);

    // Mark all connections in this group as processed
    allConnections.forEach(id => processed.add(id));
  });

  return groups;
};

/**
 * Checks if a connection is part of any duplicate group
 */
export const isConnectionDuplicate = (
  connectionId: number,
  duplicates: DuplicateInfo[]
): boolean => {
  return duplicates.some(
    dup => dup.connectionId === connectionId || dup.duplicateWith.includes(connectionId)
  );
};

/**
 * Gets duplicate information for a specific connection
 */
export const getConnectionDuplicateInfo = (
  connectionId: number,
  duplicates: DuplicateInfo[]
): DuplicateInfo | null => {
  return (
    duplicates.find(
      dup => dup.connectionId === connectionId || dup.duplicateWith.includes(connectionId)
    ) || null
  );
};
