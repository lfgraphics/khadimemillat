import { Roles } from '@/types/globals'

// Define role hierarchies and permissions
export const ROLE_PERMISSIONS = {
  // Admin roles - highest level access
  admin: {
    level: 100,
    canManageUsers: true,
    canManageGullaks: true,
    canViewAllConversations: true,
    canManageExpenses: true,
    canManageNotifications: true,
    canManageSponsorship: true,
    canManageWelfare: true,
    canDeleteItems: true,
    canViewAnalytics: true
  },
  
  // Neki Bank Manager - specialized admin for Gullak system
  neki_bank_manager: {
    level: 90,
    canManageUsers: false,
    canManageGullaks: true,
    canViewAllConversations: false,
    canManageExpenses: false,
    canManageNotifications: false,
    canManageSponsorship: false,
    canManageWelfare: false,
    canDeleteItems: false,
    canViewAnalytics: true
  },
  
  // Moderator - content and process management
  moderator: {
    level: 80,
    canManageUsers: false,
    canManageGullaks: false,
    canViewAllConversations: true,
    canManageExpenses: false,
    canManageNotifications: false,
    canManageSponsorship: true,
    canManageWelfare: true,
    canDeleteItems: false,
    canViewAnalytics: false
  },
  
  // Field Executive - field operations
  field_executive: {
    level: 60,
    canManageUsers: false,
    canManageGullaks: false,
    canViewAllConversations: false,
    canManageExpenses: false,
    canManageNotifications: false,
    canManageSponsorship: false,
    canManageWelfare: false,
    canDeleteItems: false,
    canViewAnalytics: false
  },
  
  // Surveyor - survey and assessment
  surveyor: {
    level: 50,
    canManageUsers: false,
    canManageGullaks: false,
    canViewAllConversations: false,
    canManageExpenses: false,
    canManageNotifications: false,
    canManageSponsorship: false,
    canManageWelfare: false,
    canDeleteItems: false,
    canViewAnalytics: false
  },
  
  // Accountant - financial management
  accountant: {
    level: 70,
    canManageUsers: false,
    canManageGullaks: false,
    canViewAllConversations: false,
    canManageExpenses: true,
    canManageNotifications: false,
    canManageSponsorship: false,
    canManageWelfare: false,
    canDeleteItems: false,
    canViewAnalytics: true
  },
  
  // Gullak Caretaker - specific location management
  gullak_caretaker: {
    level: 30,
    canManageUsers: false,
    canManageGullaks: false,
    canViewAllConversations: false,
    canManageExpenses: false,
    canManageNotifications: false,
    canManageSponsorship: false,
    canManageWelfare: false,
    canDeleteItems: false,
    canViewAnalytics: false
  },
  
  // User - basic access
  user: {
    level: 10,
    canManageUsers: false,
    canManageGullaks: false,
    canViewAllConversations: false,
    canManageExpenses: false,
    canManageNotifications: false,
    canManageSponsorship: false,
    canManageWelfare: false,
    canDeleteItems: false,
    canViewAnalytics: false
  }
} as const

// Helper functions for role checking
export function hasPermission(userRole: Roles | undefined, permission: keyof typeof ROLE_PERMISSIONS.admin): boolean {
  if (!userRole || !(userRole in ROLE_PERMISSIONS)) {
    return false
  }
  
  return ROLE_PERMISSIONS[userRole][permission] === true
}

export function hasMinimumRole(userRole: Roles | undefined, minimumRole: Roles): boolean {
  if (!userRole || !(userRole in ROLE_PERMISSIONS) || !(minimumRole in ROLE_PERMISSIONS)) {
    return false
  }
  
  return ROLE_PERMISSIONS[userRole].level >= ROLE_PERMISSIONS[minimumRole].level
}

export function isStaffRole(userRole: Roles | undefined): boolean {
  return hasMinimumRole(userRole, 'field_executive')
}

export function isAdminRole(userRole: Roles | undefined): boolean {
  return userRole === 'admin'
}

export function isModeratorOrAdmin(userRole: Roles | undefined): boolean {
  return userRole === 'admin' || userRole === 'moderator'
}

export function canManageGullaks(userRole: Roles | undefined): boolean {
  return hasPermission(userRole, 'canManageGullaks')
}

export function canViewAllConversations(userRole: Roles | undefined): boolean {
  return hasPermission(userRole, 'canViewAllConversations')
}

export function canManageExpenses(userRole: Roles | undefined): boolean {
  return hasPermission(userRole, 'canManageExpenses')
}

// Role groups for easier checking
export const ADMIN_ROLES: Roles[] = ['admin']
export const GULLAK_MANAGER_ROLES: Roles[] = ['admin', 'neki_bank_manager']
export const STAFF_ROLES: Roles[] = ['admin', 'moderator', 'field_executive', 'surveyor', 'accountant', 'neki_bank_manager']
export const CONVERSATION_MANAGER_ROLES: Roles[] = ['admin', 'moderator']