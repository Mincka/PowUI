import { Account } from '../types/accounts';

/**
 * Removes duplicate accounts based on account number, IBAN, and type
 * Keeps the account with the most recent last_update when duplicates are found
 */
export const deduplicateAccounts = (accounts: Account[]): Account[] => {
  const accountMap = new Map<string, Account>();

  accounts.forEach(account => {
    // Create a unique key based on account number, IBAN, and type
    const key = `${account.number}-${account.iban || 'no-iban'}-${account.type}`;

    if (!accountMap.has(key)) {
      accountMap.set(key, account);
    } else {
      // If we already have this account, keep the one with more recent last_update
      const existing = accountMap.get(key)!;
      const existingDate = new Date(existing.last_update);
      const currentDate = new Date(account.last_update);

      console.log(`Duplicate found for account ${account.number}:`, {
        existing: { id: existing.id, last_update: existing.last_update },
        current: { id: account.id, last_update: account.last_update },
        keepingCurrent: currentDate > existingDate,
      });

      if (currentDate > existingDate) {
        accountMap.set(key, account);
      }
    }
  });

  console.log(`Deduplication: ${accounts.length} -> ${accountMap.size} accounts`);

  return Array.from(accountMap.values());
};

/**
 * Filters accounts based on provided filters and removes duplicates
 */
export const filterAndDeduplicateAccounts = (
  accounts: Account[],
  filters: {
    accountType?: string;
    minBalance?: string;
    maxBalance?: string;
    searchTerm?: string;
  }
): Account[] => {
  // First deduplicate
  const uniqueAccounts = deduplicateAccounts(accounts);

  // Then apply filters
  return uniqueAccounts.filter(account => {
    // Filter by account type
    if (filters.accountType && account.type !== filters.accountType) {
      return false;
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (
        !account.name.toLowerCase().includes(searchLower) &&
        !account.number.toLowerCase().includes(searchLower) &&
        !(account.iban && account.iban.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }

    // Filter by balance range
    if (
      filters.minBalance !== '' &&
      filters.minBalance !== undefined &&
      account.balance < parseFloat(filters.minBalance)
    ) {
      return false;
    }
    if (
      filters.maxBalance !== '' &&
      filters.maxBalance !== undefined &&
      account.balance > parseFloat(filters.maxBalance)
    ) {
      return false;
    }

    return true;
  });
};
