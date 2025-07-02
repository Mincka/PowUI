# User Management Guide for Powens Integration

This guide explains how to use the new user management feature that allows you to create and manage multiple Powens users within the application.

## Overview

The user management system allows you to:
- Create new users in your Powens application
- Switch between different users
- Delete users when no longer needed
- Store user credentials locally for easy switching

## Getting Started

### 1. Initial Setup

Before you can create users, you need to configure your Powens application credentials:

1. Open the API Configuration panel (⚙️ Configuration API)
2. Fill in the required fields:
   - **Domain**: Your Powens sandbox domain (e.g., `mysandbox.biapi.pro`)
   - **Client ID**: Your application's client ID from Powens
3. Save the configuration

### 2. Creating Your First User

1. In the API Configuration panel, click **👥 Gérer les utilisateurs**
2. Click **Nouveau utilisateur**
3. Fill in the form:
   - **Display Name** (optional): A friendly name for the user (e.g., "Personal Account", "Business Account")
   - **Client Secret**: Your application's client secret from Powens (required for user creation)
4. Click **Créer l'utilisateur**

The system will:
- Send a POST request to `https://{domain}/2.0/auth/init`
- Receive back an `auth_token` and `id_user`
- Store the user locally for future use
- Automatically update the API configuration with the new user's credentials

### 3. Switching Between Users

1. Open the user management panel
2. Click **Utiliser** next to any user to switch to that user
3. The application will automatically:
   - Update the API configuration
   - Refresh all data with the new user's context

### 4. Managing Users

#### Viewing Users
- All created users are listed in the user management panel
- The currently active user is highlighted with an "ACTIF" badge
- Each user shows their ID, type, and creation date

#### Deleting Users
1. Enter your Client Secret in the user management panel
2. Click **Supprimer** next to the user you want to delete
3. Confirm the deletion

**Note**: The system will attempt to delete the user from the Powens API first, then remove it locally.

## API Endpoints Used

### Create User
```
POST https://{domain}/2.0/auth/init
Content-Type: application/json

{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

**Response:**
```json
{
  "auth_token": "user_auth_token",
  "type": "permanent",
  "id_user": 123
}
```

### List Users
```
GET https://{domain}/2.0/users
Authorization: Basic {base64(client_id:client_secret)}
```

### Delete User
```
DELETE https://{domain}/2.0/users/{userId}
Authorization: Basic {base64(client_id:client_secret)}
```

## Data Storage

User data is stored locally in `localStorage` under the key `powensUsers`:

```json
[
  {
    "id": 123,
    "authToken": "user_auth_token",
    "type": "permanent",
    "name": "Personal Account",
    "createdAt": "2025-01-30T10:00:00Z",
    "isActive": true
  }
]
```

## Security Considerations

- **Client Secret**: Only used temporarily for user creation/deletion operations. Not stored permanently.
- **Auth Tokens**: Stored locally but marked as sensitive data.
- **User Switching**: Automatically updates API configuration and refreshes data securely.

## Workflow Example

1. **Bob sets up his Powens application**:
   - Gets Client ID and Client Secret from Powens developer portal
   - Configures domain and Client ID in the app

2. **Bob creates his first user**:
   - Opens user management
   - Creates "Personal Banking" user with Client Secret
   - System stores user locally and activates it

3. **Bob creates a second user for business**:
   - Creates "Business Banking" user
   - Now has two separate contexts for his banking data

4. **Bob switches between contexts**:
   - Clicks on "Business Banking" user
   - Application automatically loads business banking connections and accounts
   - Switches back to "Personal Banking" when needed

## Troubleshooting

### "Client ID and Client Secret are required"
- Ensure both fields are filled in the API configuration
- Verify your credentials are correct from the Powens developer portal

### "Unauthorized" errors
- Check that your Client ID and Client Secret are valid
- Ensure your Powens application has the necessary permissions

### Users not appearing after creation
- Check the browser console for error messages
- Verify the user was created successfully in the Powens admin panel

### Cannot delete the last user
- The system prevents deleting the last remaining user
- Create a new user before deleting the current one

## Integration with Existing Features

The user management system is designed to work seamlessly with existing features:

- **Connection Management**: Each user has their own set of connections
- **Account Data**: Switching users automatically loads that user's accounts
- **Sync Operations**: All sync operations use the active user's credentials
- **Mock Data Mode**: User management is disabled in mock data mode

## Technical Implementation

### Components
- `UserManager`: Main UI component for user management
- `UserService`: Handles all user-related API operations and storage
- `ApiConfiguration`: Updated to include user management integration

### Services
- User creation, deletion, and listing
- Local storage management
- User switching with automatic configuration updates

### Types
- `PowensUser`: User data structure
- `PowensUserCreateRequest/Response`: API request/response types
