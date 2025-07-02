import {
  PowensUser,
  PowensUserCreateRequest,
  PowensUserCreateResponse,
  PowensUsersListResponse,
  CombinedUserData,
  PowensTokenRenewRequest,
  PowensTokenRenewResponse,
} from '../types/accounts';
import { ApiConfig } from '../config/api';

export class UserService {
  private static readonly STORAGE_KEY = 'powensUsers';

  /**
   * Create a new user in Powens
   */
  static async createUser(
    clientId: string,
    clientSecret: string,
    config: ApiConfig
  ): Promise<PowensUser> {
    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    try {
      const apiUrl = `${config.apiUrl}auth/init`;

      const requestBody: PowensUserCreateRequest = {
        client_id: clientId,
        client_secret: clientSecret,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Handle specific error codes
        switch (response.status) {
          case 400:
            throw new Error(
              `Bad Request: ${errorMessage}. Please check your Client ID and Client Secret.`
            );
          case 401:
            throw new Error(`Unauthorized: ${errorMessage}. Invalid Client ID or Client Secret.`);
          case 403:
            throw new Error(
              `Forbidden: ${errorMessage}. You don't have permission to create users.`
            );
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          case 500:
            throw new Error(`Server error: ${errorMessage}. Please try again later.`);
          default:
            throw new Error(`Failed to create user: ${errorMessage}`);
        }
      }

      const data: PowensUserCreateResponse = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object' || !data.auth_token || !data.id_user) {
        throw new Error('Invalid response format: Expected auth_token and id_user');
      }

      // Create user object
      const newUser: PowensUser = {
        id: data.id_user,
        authToken: data.auth_token,
        type: data.type || 'permanent',
        name: `User ${data.id_user}`,
        createdAt: new Date().toISOString(),
        isActive: false, // Will be set to active by the caller if needed
      };

      // Store the user
      this.addUser(newUser);

      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * List all users from Powens API using Users token
   */
  static async listUsersFromApi(
    usersToken: string,
    config: ApiConfig
  ): Promise<PowensUsersListResponse> {
    if (!usersToken) {
      throw new Error('Users token is required');
    }

    try {
      const apiUrl = `${config.apiUrl}users`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${usersToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Handle specific error codes
        switch (response.status) {
          case 401:
            throw new Error(`Unauthorized: ${errorMessage}. Please check your Users token.`);
          case 404:
            throw new Error(`Resource not found: ${errorMessage}. Please verify your domain.`);
          case 403:
            throw new Error(`Forbidden: ${errorMessage}. You don't have permission to list users.`);
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          case 500:
            throw new Error(`Server error: ${errorMessage}. Please try again later.`);
          default:
            throw new Error(`Failed to list users: ${errorMessage}`);
        }
      }

      const data: PowensUsersListResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error listing users from API:', error);
      throw error;
    }
  }

  /**
   * Delete a user from Powens API using user's auth token
   */
  static async deleteUserFromApi(
    userId: number,
    userAuthToken: string,
    config: ApiConfig
  ): Promise<void> {
    if (!userAuthToken) {
      throw new Error('User auth token is required');
    }

    try {
      const apiUrl = `${config.apiUrl}users/${userId}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Handle specific error codes
        switch (response.status) {
          case 401:
            throw new Error(`Unauthorized: ${errorMessage}. Please check the user's auth token.`);
          case 404:
            throw new Error(
              `User not found: ${errorMessage}. The user may have already been deleted.`
            );
          case 403:
            throw new Error(
              `Forbidden: ${errorMessage}. You don't have permission to delete this user.`
            );
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          case 500:
            throw new Error(`Server error: ${errorMessage}. Please try again later.`);
          default:
            throw new Error(`Failed to delete user: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error deleting user from API:', error);
      throw error;
    }
  }

  /**
   * Renew or get auth token for a user
   */
  static async renewUserToken(
    userId: number,
    clientId: string,
    clientSecret: string,
    config: ApiConfig,
    revokePrevious: boolean = false
  ): Promise<string> {
    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    try {
      const apiUrl = `${config.apiUrl}auth/renew`;

      const requestBody: PowensTokenRenewRequest = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        id_user: userId,
        revoke_previous: revokePrevious,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.code && errorData.description) {
            errorMessage = `${errorData.code}: ${errorData.description}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        // Handle specific error codes
        switch (response.status) {
          case 400:
            throw new Error(`Bad Request: ${errorMessage}. Please check your parameters.`);
          case 401:
            throw new Error(`Unauthorized: ${errorMessage}. Invalid Client ID or Client Secret.`);
          case 403:
            throw new Error(
              `Forbidden: ${errorMessage}. You don't have permission to renew this user's token.`
            );
          case 404:
            throw new Error(`User not found: ${errorMessage}. Please verify the user ID.`);
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          case 500:
            throw new Error(`Server error: ${errorMessage}. Please try again later.`);
          default:
            throw new Error(`Failed to renew token: ${errorMessage}`);
        }
      }

      const data: PowensTokenRenewResponse = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object' || !data.access_token) {
        throw new Error('Invalid response format: Expected access_token');
      }

      return data.access_token;
    } catch (error) {
      console.error('Error renewing user token:', error);
      throw error;
    }
  }

  /**
   * Get all stored users from localStorage
   */
  static getStoredUsers(): PowensUser[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const users = JSON.parse(stored);
      return Array.isArray(users) ? users : [];
    } catch (error) {
      console.error('Error loading stored users:', error);
      return [];
    }
  }

  /**
   * Save users to localStorage
   */
  static saveUsers(users: PowensUser[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
      throw new Error('Failed to save users to local storage');
    }
  }

  /**
   * Add a new user to localStorage
   */
  static addUser(user: PowensUser): void {
    const users = this.getStoredUsers();

    // Check if user already exists
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex !== -1) {
      // Update existing user
      users[existingIndex] = user;
    } else {
      // Add new user
      users.push(user);
    }

    this.saveUsers(users);
  }

  /**
   * Remove a user from localStorage
   */
  static removeUser(userId: number): void {
    const users = this.getStoredUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    this.saveUsers(filteredUsers);
  }

  /**
   * Set the active user
   */
  static setActiveUser(userId: number): PowensUser | null {
    const users = this.getStoredUsers();

    // Deactivate all users first
    users.forEach(user => {
      user.isActive = false;
    });

    // Activate the selected user
    const activeUser = users.find(u => u.id === userId);
    if (activeUser) {
      activeUser.isActive = true;
      this.saveUsers(users);
      return activeUser;
    }

    return null;
  }

  /**
   * Get the currently active user
   */
  static getActiveUser(): PowensUser | null {
    const users = this.getStoredUsers();
    return users.find(u => u.isActive) || null;
  }

  /**
   * Update user display name
   */
  static updateUserName(userId: number, name: string): void {
    const users = this.getStoredUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.name = name;
      this.saveUsers(users);
    }
  }

  /**
   * Delete user both locally and from API
   */
  static async deleteUser(userId: number, userAuthToken: string, config: ApiConfig): Promise<void> {
    // First try to delete from API using user's auth token
    try {
      await this.deleteUserFromApi(userId, userAuthToken, config);
    } catch (error) {
      // If API deletion fails, we might still want to remove locally
      console.warn('Failed to delete user from API, removing locally only:', error);
    }

    // Remove from local storage
    this.removeUser(userId);
  }

  /**
   * Delete user with token renewal if needed
   */
  static async deleteUserWithRenewal(
    userData: CombinedUserData,
    clientId: string,
    clientSecret: string,
    config: ApiConfig,
    revokePrevious: boolean = false
  ): Promise<void> {
    let authToken = userData.localUser?.authToken;

    // If user is not configured locally or has no auth token, try to renew
    if (!authToken) {
      try {
        authToken = await this.renewUserToken(
          userData.apiUser.id,
          clientId,
          clientSecret,
          config,
          revokePrevious
        );

        // If renewal was successful, update local storage
        if (userData.localUser) {
          userData.localUser.authToken = authToken;
          this.addUser(userData.localUser);
        }
      } catch (error) {
        throw new Error(
          `Cannot delete user: ${error instanceof Error ? error.message : 'Unable to get auth token'}`
        );
      }
    }

    // Now delete with the auth token
    await this.deleteUser(userData.apiUser.id, authToken, config);
  }

  /**
   * Renew token and update local storage
   */
  static async renewAndUpdateToken(
    userId: number,
    clientId: string,
    clientSecret: string,
    config: ApiConfig,
    revokePrevious: boolean = false
  ): Promise<PowensUser> {
    const newToken = await this.renewUserToken(
      userId,
      clientId,
      clientSecret,
      config,
      revokePrevious
    );

    // Update or create user in local storage
    const users = this.getStoredUsers();
    let user = users.find(u => u.id === userId);

    if (user) {
      // Update existing user
      user.authToken = newToken;
      this.addUser(user);
    } else {
      // Create new user entry
      user = {
        id: userId,
        authToken: newToken,
        type: 'permanent',
        name: `User ${userId}`,
        createdAt: new Date().toISOString(),
        isActive: false,
      };
      this.addUser(user);
    }

    return user;
  }

  /**
   * Get combined user data: API users with their local configuration status
   */
  static async getCombinedUsersData(
    usersToken: string,
    config: ApiConfig
  ): Promise<CombinedUserData[]> {
    try {
      // Fetch users from API
      const apiResponse = await this.listUsersFromApi(usersToken, config);
      const apiUsers = apiResponse.users;

      // Get local users
      const localUsers = this.getStoredUsers();

      // Combine the data
      const combinedData: CombinedUserData[] = apiUsers.map(apiUser => {
        const localUser = localUsers.find(localU => localU.id === apiUser.id);
        return {
          apiUser,
          localUser: localUser || null,
          isConfigured: !!localUser,
        };
      });

      return combinedData;
    } catch (error) {
      console.error('Error getting combined users data:', error);
      throw error;
    }
  }

  /**
   * Configure an unknown user by adding auth token and name to local storage
   */
  static configureUser(
    userId: number,
    authToken: string,
    name: string,
    type: string = 'permanent'
  ): PowensUser {
    const newUser: PowensUser = {
      id: userId,
      authToken: authToken.trim(),
      type,
      name: name.trim() || `User ${userId}`,
      createdAt: new Date().toISOString(),
      isActive: false,
    };

    this.addUser(newUser);
    return newUser;
  }

  /**
   * Clear all stored users (for testing/reset purposes)
   */
  static clearAllUsers(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
