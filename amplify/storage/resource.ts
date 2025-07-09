import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'amplifyPermissionsStorage',
  access: (allow) => ({
    // Public access - anyone can read, authenticated users can write
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    
    // Protected access - everyone can read, only the owner can write/delete
    'protected/*': [
      allow.authenticated.to(['read']),
      allow.owner.to(['read', 'write', 'delete'])
    ],
    
    // Private access - only the owner can access
    'private/{entity_id}/*': [
      allow.owner.to(['read', 'write', 'delete'])
    ],
    
    // Group-based access patterns
    'admin/*': [
      allow.groups(['Admins']).to(['read', 'write', 'delete'])
    ],
    
    'moderators/*': [
      allow.groups(['Admins', 'Moderators']).to(['read', 'write', 'delete'])
    ],
    
    'reports/*': [
      allow.groups(['Admins']).to(['read', 'write', 'delete']),
      allow.groups(['Moderators']).to(['read'])
    ],
    
    // Department-based access using custom attributes
    'departments/{custom:department}/*': [
      allow.owner.to(['read', 'write', 'delete'])
    ],
    
    // Shared workspace access
    'shared/team-{custom:team_id}/*': [
      allow.authenticated.to(['read']),
      allow.owner.to(['read', 'write', 'delete'])
    ],
    
    // Upload staging area - temporary upload location
    'uploads/staging/{entity_id}/*': [
      allow.owner.to(['write', 'delete']),
      allow.groups(['Admins']).to(['read', 'write', 'delete'])
    ],
    
    // Archive access - read-only for most users
    'archive/*': [
      allow.authenticated.to(['read']),
      allow.groups(['Admins']).to(['read', 'write', 'delete'])
    ],
    
    // Backup access - admin only
    'backups/*': [
      allow.groups(['Admins']).to(['read', 'write', 'delete'])
    ]
  })
});
