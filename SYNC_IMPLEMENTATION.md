# Powens API Synchronization Implementation

## Overview
This implementation adds comprehensive synchronization capabilities to the financial dashboard using the Powens API. Users can now force synchronization of their bank connections and view scheduling information.

## Features Implemented

### 1. Connection Management
- **Fetch Connections**: Retrieve all user connections from Powens API
- **Connection Status**: Display connection state, errors, and activity status
- **Connection Details**: Show last update, next scheduled sync, and expiration dates

### 2. Manual Synchronization
- **Individual Sync**: Force synchronization of specific connections
- **Global Sync**: Synchronize all active connections at once
- **Real-time Status**: Visual feedback during synchronization process

### 3. Scheduling Information
- **Next Sync Time**: Display when the next automatic sync is scheduled
- **Time Formatting**: Human-readable time differences (minutes, hours, days)
- **Sync History**: Show last successful synchronization timestamps

### 4. Error Handling
- **Connection Errors**: Display connection-specific error messages
- **Sync Failures**: Handle and display synchronization failures
- **Recovery Actions**: Provide guidance for resolving connection issues

## Technical Implementation

### New Types (`src/types/accounts.ts`)
```typescript
interface Connection {
  id: number;
  id_user: number;
  id_connector: number;
  state: string | null;           // Error state if any
  error: string | null;           // Legacy error field
  error_message: string | null;   // Human-readable error message
  last_update: string | null;     // Last successful sync
  created: string | null;         // Connection creation date
  active: boolean;                // Whether connection is active
  last_push: string | null;       // Last push notification
  expire: string | null;          // Connection expiration
  connector_uuid: string;         // Connector identifier
  next_try: string | null;        // Next scheduled sync
}

interface SyncStatus {
  isLoading: boolean;
  connectionId: number | null;
  lastSync: string | null;
  error: string | null;
}
```

### Service Layer (`src/services/accountsService.ts`)
Extended the AccountsService with:
- `fetchConnections()`: Get all user connections
- `syncConnection(connectionId)`: Force sync specific connection
- `syncAllConnections()`: Sync all active connections
- `getConnectionsFromAccounts()`: Map connections to accounts

### Hook (`src/hooks/useSyncManager.ts`)
Custom hook providing:
- Connection state management
- Synchronization actions
- Status tracking
- Helper functions for connection data

### UI Components

The synchronization UI is integrated directly into the `ConnectionManager` and other relevant components, using the `useSyncManager` hook to provide functionality. There is no standalone `SyncManager` component.

Key UI features include:
- **Global Sync Controls**: Buttons to sync all connections are available in the main management view.
- **Individual Sync Actions**: Each connection in the `ConnectionManager` has its own controls for manual synchronization.
- **Status Indicators**: Visual feedback (e.g., loading spinners, status icons) is provided during sync operations.
- **Error Display**: Connection-specific errors are displayed clearly to the user.

## API Endpoints Used

### Connections Management
- `GET /2.0/users/{userId}/connections` - List all connections
- `PUT /2.0/users/{userId}/connections/{connectionId}` - Force sync connection

### Query Parameters
- `psu_requested`: Controls SCA behavior (default: true)
  - `true`: Normal sync (may trigger SCA)
  - `false`: Force sync when PSU not present (compliance mode)

## Integration Points

### Integration with Components

The `useSyncManager` hook is consumed by components like `ConnectionManager` and `BankManager` to provide synchronization features directly within the existing UI, rather than through a separate `SyncManager` component.

## User Experience

### Visual Design
- **Color-coded status** indicators (green=healthy, red=error, gray=inactive) are used throughout the UI to show connection health.
- **Loading animations** provide feedback during synchronization.
- The design is responsive and integrated into the existing component structure.

### Interaction Flow
1. **View Summary**: See total connections and health status
2. **Expand Details**: Click to view individual connections
3. **Individual Sync**: Force sync specific connections
4. **Global Sync**: Sync all active connections at once
5. **Monitor Progress**: Real-time feedback during operations

### Error Handling
- **Clear Messages**: Human-readable error descriptions
- **Recovery Guidance**: Actionable error information
- **Non-blocking**: Errors don't prevent other operations

## Mock Mode Support
Includes comprehensive mock data for development:
- Simulated connections with realistic data
- Artificial delays to test loading states
- Various connection states for testing

## Browser Compatibility
- Modern browsers with ES6+ support
- Responsive design for mobile devices
- Graceful degradation for older browsers

## Security Considerations
- Bearer token authentication for all API calls
- Error messages don't expose sensitive information
- Compliance with PSD2 requirements via `psu_requested` parameter

## Performance Optimizations
- Efficient connection caching
- Minimal re-renders with React hooks
- Debounced sync operations
- Smart polling for status updates

## Future Enhancements
- **Automatic Refresh**: Periodic connection status updates
- **Notifications**: Browser notifications for sync completion
- **Batch Operations**: Select multiple connections for bulk operations
- **Connection Analytics**: Historical sync performance data
- **Advanced Filtering**: Filter connections by status, last sync, etc.
