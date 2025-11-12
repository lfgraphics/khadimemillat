import { ICampaignDonation } from '@/models/CampaignDonation'

export type AuditAction = 'created' | 'payment_verified' | 'audit_approved' | 'audit_rejected' | 'visibility_changed' | 'payment_rechecked'

export interface AuditLogEntry {
  action: AuditAction
  performedBy: string // Clerk user ID
  performedAt: Date
  details?: string
  previousValues?: Record<string, any>
}

/**
 * Add an audit log entry to a donation
 */
export function addAuditLogEntry(
  donation: ICampaignDonation,
  entry: Omit<AuditLogEntry, 'performedAt'>
): void {
  if (!donation.auditLog) {
    donation.auditLog = []
  }
  
  donation.auditLog.push({
    ...entry,
    performedAt: new Date()
  })
}

/**
 * Get the latest audit log entry for a specific action
 */
export function getLatestAuditEntry(
  donation: ICampaignDonation,
  action: AuditAction
): AuditLogEntry | null {
  if (!donation.auditLog || donation.auditLog.length === 0) {
    return null
  }
  
  const entries = donation.auditLog
    .filter(entry => entry.action === action)
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
  
  return entries[0] || null
}

/**
 * Check if a donation meets visibility criteria
 */
export function checkVisibilityRules(donation: ICampaignDonation): {
  isVisibleInReports: boolean
  isVisibleInPublic: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  
  const isPaymentVerified = donation.paymentVerified === true
  const isAuditVerified = donation.auditStatus === 'verified'
  const isCompleted = donation.status === 'completed'
  
  if (!isPaymentVerified) {
    reasons.push('Payment not verified')
  }
  
  if (!isAuditVerified) {
    reasons.push('Audit not verified')
  }
  
  if (!isCompleted) {
    reasons.push('Status not completed')
  }
  
  const isVisibleInReports = isPaymentVerified && isCompleted
  const isVisibleInPublic = isPaymentVerified && isAuditVerified && isCompleted
  
  return {
    isVisibleInReports,
    isVisibleInPublic,
    reasons: reasons.length > 0 ? reasons : ['All criteria met']
  }
}

/**
 * Update donation visibility and log the change
 */
export function updateDonationVisibility(
  donation: ICampaignDonation,
  performedBy: string,
  reason?: string
): boolean {
  const previousVisibility = {
    isVisibleInReports: donation.isVisibleInReports,
    isVisibleInPublic: donation.isVisibleInPublic
  }
  
  const { isVisibleInReports, isVisibleInPublic, reasons } = checkVisibilityRules(donation)
  
  const hasChanged = 
    donation.isVisibleInReports !== isVisibleInReports ||
    donation.isVisibleInPublic !== isVisibleInPublic
  
  if (hasChanged) {
    donation.isVisibleInReports = isVisibleInReports
    donation.isVisibleInPublic = isVisibleInPublic
    
    addAuditLogEntry(donation, {
      action: 'visibility_changed',
      performedBy,
      details: reason || `Visibility updated based on current status. Reasons: ${reasons.join(', ')}`,
      previousValues: previousVisibility
    })
  }
  
  return hasChanged
}

/**
 * Get audit statistics for a donation
 */
export function getAuditStatistics(donation: ICampaignDonation): {
  totalAuditEntries: number
  paymentRecheckCount: number
  lastPaymentRecheck?: Date
  lastAuditAction?: AuditLogEntry
} {
  const auditLog = donation.auditLog || []
  const recheckHistory = donation.paymentRecheckHistory || []
  
  const paymentRecheckEntries = auditLog.filter(entry => entry.action === 'payment_rechecked')
  const lastAuditAction = auditLog.length > 0 
    ? auditLog.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())[0]
    : undefined
  
  const lastPaymentRecheck = recheckHistory.length > 0
    ? recheckHistory.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())[0]?.performedAt
    : undefined
  
  return {
    totalAuditEntries: auditLog.length,
    paymentRecheckCount: paymentRecheckEntries.length,
    lastPaymentRecheck,
    lastAuditAction
  }
}