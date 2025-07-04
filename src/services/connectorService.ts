import { Connector, ConnectorsResponse, ConnectorCache } from '../types/accounts';
import { ApiConfig } from '../config/api';

/**
 * Service for managing connector data with smart caching
 */
export class ConnectorService {
  private static readonly CACHE_KEY = 'powens_connectors_cache';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static cache: Map<number, Connector> | null = null;

  /**
   * Load cache from localStorage
   */
  static loadCache(apiUrl: string): Map<number, Connector> | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cacheData: ConnectorCache = JSON.parse(cached);

      // Check if cache is still valid
      const isExpired = Date.now() - cacheData.timestamp > this.CACHE_DURATION;
      const isDifferentApiUrl = cacheData.domain !== apiUrl;

      if (isExpired || isDifferentApiUrl) {
        console.log('🗑️ Connector cache expired or API URL changed, clearing cache');
        this.clearCache();
        return null;
      }

      // Convert object back to Map
      this.cache = new Map(Object.entries(cacheData.data).map(([k, v]) => [parseInt(k), v]));
      console.log(`✅ Loaded ${this.cache.size} connectors from cache`);
      return this.cache;
    } catch (error) {
      console.error('Error loading connector cache:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Save cache to localStorage
   */
  static saveCache(connectors: Connector[], apiUrl: string): void {
    try {
      const dataMap = new Map(connectors.map(c => [c.id, c]));

      const cacheData: ConnectorCache = {
        data: Object.fromEntries(dataMap),
        timestamp: Date.now(),
        version: '1.0',
        domain: apiUrl,
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      this.cache = dataMap;
      console.log(`💾 Cached ${connectors.length} connectors for API URL ${apiUrl}`);
    } catch (error) {
      console.error('Error saving connector cache:', error);
    }
  }

  /**
   * Check if we have a specific connector
   */
  static hasConnector(connectorId: number): boolean {
    return this.cache?.has(connectorId) ?? false;
  }

  /**
   * Get connector from cache
   */
  static getConnector(connectorId: number): Connector | null {
    return this.cache?.get(connectorId) ?? null;
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    this.cache = null;
  }

  /**
   * Get missing connector IDs
   */
  static getMissingConnectorIds(requestedIds: number[]): number[] {
    if (!this.cache) return requestedIds;
    return requestedIds.filter(id => !this.cache!.has(id));
  }

  /**
   * Get mock connectors for demo mode
   */
  static getMockConnectors(): ConnectorsResponse {
    return {
      connectors: [
        {
          id: 101,
          name: 'BoursoBank',
          hidden: false,
          charged: false,
          code: 'boursobank',
          beta: false,
          color: '#00A651',
          slug: 'boursobank',
          sync_periodicity: null,
          months_to_fetch: null,
          siret: null,
          uuid: 'boursobank-demo',
          restricted: false,
          stability: {
            status: 'stable',
            last_update: '2025-01-01',
          },
          capabilities: ['accounts', 'transactions'],
          available_auth_mechanisms: ['password'],
          categories: [],
          auth_mechanism: 'password',
          account_types: ['checking', 'savings', 'market'],
          account_usages: ['PRIV', 'ORGA'],
          products: [],
        },
        {
          id: 102,
          name: 'Fortuneo',
          hidden: false,
          charged: false,
          code: 'fortuneo',
          beta: false,
          color: '#FF6900',
          slug: 'fortuneo',
          sync_periodicity: null,
          months_to_fetch: null,
          siret: null,
          uuid: 'fortuneo-demo',
          restricted: false,
          stability: {
            status: 'stable',
            last_update: '2025-01-01',
          },
          capabilities: ['accounts', 'transactions'],
          available_auth_mechanisms: ['password'],
          categories: [],
          auth_mechanism: 'password',
          account_types: ['loan', 'card'],
          account_usages: ['PRIV', 'ORGA'],
          products: [],
        },
        {
          id: 103,
          name: 'Bourse Direct',
          hidden: false,
          charged: false,
          code: 'bourse-direct',
          beta: false,
          color: '#003366',
          slug: 'bourse-direct',
          sync_periodicity: null,
          months_to_fetch: null,
          siret: null,
          uuid: 'bourse-direct-demo',
          restricted: false,
          stability: {
            status: 'stable',
            last_update: '2025-01-01',
          },
          capabilities: ['accounts', 'transactions'],
          available_auth_mechanisms: ['password'],
          categories: [],
          auth_mechanism: 'password',
          account_types: ['savings', 'market', 'card', 'revolving_credit'],
          account_usages: ['PRIV'],
          products: [],
        },
      ],
      total: 3,
    };
  }

  /**
   * Fetch connectors from API (no authentication required)
   */
  static async fetchConnectors(config: ApiConfig): Promise<ConnectorsResponse> {
    // Return mock data in mock mode
    if (config.mode === 'mock') {
      console.log('🎭 Using mock connectors data');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.getMockConnectors();
    }

    try {
      // Build the connectors URL (no auth required)
      const apiUrl = `${config.apiUrl}connectors`;

      console.log(`🔄 Fetching connectors from: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch connectors: HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: ConnectorsResponse = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format: Expected JSON object');
      }

      if (!Array.isArray(data.connectors)) {
        throw new Error('Invalid response format: Missing or invalid connectors array');
      }

      console.log(`✅ Fetched ${data.connectors.length} connectors from API`);
      return data;
    } catch (error) {
      console.error('Error fetching connectors from API:', error);
      throw error;
    }
  }

  /**
   * Get connectors with smart caching
   * Only fetches from API if cache is missing or incomplete
   */
  static async getConnectorsWithCache(
    neededConnectorIds: number[],
    config: ApiConfig
  ): Promise<Map<number, Connector>> {
    // 1. Load existing cache
    const connectorMap = this.loadCache(config.apiUrl) || new Map();

    // 2. Check what connector IDs we're missing
    const missingIds = this.getMissingConnectorIds(neededConnectorIds);

    // 3. If we have everything, return cached data
    if (missingIds.length === 0 && connectorMap.size > 0) {
      console.log(`✅ Using cached connector data for ${neededConnectorIds.length} connectors`);
      return connectorMap;
    }

    // 4. Fetch fresh data if we're missing connectors or cache is empty
    console.log(
      `🔄 Fetching connectors (missing: ${missingIds.length}, cache size: ${connectorMap.size})`
    );

    try {
      const connectorsResponse = await this.fetchConnectors(config);
      const freshConnectors = connectorsResponse.connectors;

      // 5. Update cache with fresh data
      this.saveCache(freshConnectors, config.apiUrl);

      // 6. Return fresh connector map
      return new Map(freshConnectors.map(c => [c.id, c]));
    } catch (error) {
      console.warn('Failed to fetch fresh connectors, using cache if available:', error);

      // 7. Fallback to cache even if some connectors are missing
      if (connectorMap.size > 0) {
        console.log(`⚠️ Using partial cache with ${connectorMap.size} connectors`);
        return connectorMap;
      }

      throw error;
    }
  }

  /**
   * Get connector name with fallback
   */
  static getConnectorName(connectorId: number, connectorMap?: Map<number, Connector>): string {
    const map = connectorMap || this.cache || undefined;
    const connector = map?.get(connectorId);
    return connector?.name || `Connector ${connectorId}`;
  }

  /**
   * Get connector color with fallback and darkening if too light
   */
  static getConnectorColor(connectorId: number, connectorMap?: Map<number, Connector>): string {
    const map = connectorMap || this.cache || undefined;
    const connector = map?.get(connectorId);

    if (connector?.color) {
      // Add # prefix if not present
      const color = connector.color.startsWith('#') ? connector.color : `#${connector.color}`;

      // If too light, darken it instead of generating a new color
      if (this.isColorTooLight(color)) {
        return this.darkenColor(color, 0.3); // darken by 30%
      }

      return color;
    }

    // Fallback to generated color
    return this.generateColorFromId(connectorId);
  }

  /**
   * Darken a hex or rgb color by a given amount (0 = no change, 1 = black)
   */
  private static darkenColor(color: string, amount: number): string {
    // Only handle hex colors for now
    let r: number, g: number, b: number;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        return color; // Invalid hex, return as is
      }
    } else if (color.startsWith('rgb(')) {
      const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!matches) return color;
      r = parseInt(matches[1]);
      g = parseInt(matches[2]);
      b = parseInt(matches[3]);
    } else {
      return color; // Unknown format
    }
    // Darken each channel
    r = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Check if a color is too light for good contrast with white text
   */
  private static isColorTooLight(color: string): boolean {
    // Convert hex to RGB
    let r: number, g: number, b: number;

    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        return false; // Invalid hex format, assume it's fine
      }
    } else if (color.startsWith('rgb(')) {
      const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!matches) return false;
      r = parseInt(matches[1]);
      g = parseInt(matches[2]);
      b = parseInt(matches[3]);
    } else {
      return false; // Unknown format, assume it's fine
    }

    // Calculate relative luminance using WCAG formula
    const toLinear = (c: number) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    // If luminance is > 0.5, it's too light for white text (contrast ratio < 4.5:1)
    return luminance > 0.5;
  }

  /**
   * Generate a deterministic color for a connector ID
   */
  private static generateColorFromId(connectorId: number): string {
    // Generate a deterministic color based on connector ID
    const hue = (connectorId * 137.508) % 360; // Golden angle approximation
    return `hsl(${Math.floor(hue)}, 65%, 30%)`;
  }

  /**
   * Get connector info with all details
   */
  static getConnectorInfo(connectorId: number, connectorMap?: Map<number, Connector>) {
    const map = connectorMap || this.cache || undefined;
    const connector = map?.get(connectorId);

    return {
      id: connectorId,
      name: this.getConnectorName(connectorId, map),
      color: this.getConnectorColor(connectorId, map),
      slug: connector?.slug || '',
      beta: connector?.beta || false,
      hidden: connector?.hidden || false,
      charged: connector?.charged || false,
      capabilities: connector?.capabilities || [],
      accountTypes: connector?.account_types || [],
      stability: connector?.stability || { status: 'unknown', last_update: '' },
      connector,
    };
  }

  /**
   * Force refresh cache (useful for debugging)
   */
  static async forceRefresh(config: ApiConfig): Promise<Map<number, Connector>> {
    console.log('🔄 Force refreshing connector cache...');
    this.clearCache();

    try {
      const connectorsResponse = await this.fetchConnectors(config);
      this.saveCache(connectorsResponse.connectors, config.apiUrl);
      return new Map(connectorsResponse.connectors.map(c => [c.id, c]));
    } catch (error) {
      console.error('Failed to force refresh connectors:', error);
      throw error;
    }
  }
}
