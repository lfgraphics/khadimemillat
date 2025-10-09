/**
 * Models index file
 * Import all models to ensure they are registered with Mongoose
 * This prevents "Schema hasn't been registered" errors
 */

// Import all models to register them with Mongoose
import "./User"
import "./CollectionRequest"
import "./DonationEntry"
import "./ScrapItem"
import "./Notification"
import "./NotificationAnalytics"
import "./NotificationLog"
import "./NotificationTemplate"
import "./WebPushSubscription"
import "./WelfareProgram"
import "./Campaign"
import "./CampaignDonation"
import "./NotificationCampaign"
import "./UserPreferences"
import "./AudienceSegment"
import "./Conversation"
import "./Message"
import "./Purchase"

// Re-export models for convenience
export { default as User } from "./User"
export { default as CollectionRequest } from "./CollectionRequest"
export { default as DonationEntry } from "./DonationEntry"
export { default as ScrapItem } from "./ScrapItem"
export { default as Notification } from "./Notification"
export { default as NotificationAnalytics } from "./NotificationAnalytics"
export { default as NotificationLog } from "./NotificationLog"
export { default as NotificationTemplate } from "./NotificationTemplate"
export { default as WebPushSubscription } from "./WebPushSubscription"
export { default as WelfareProgram } from "./WelfareProgram"
export { default as Campaign } from "./Campaign"
export { default as CampaignDonation } from "./CampaignDonation"
export { default as NotificationCampaign } from "./NotificationCampaign"
export { default as UserPreferences } from "./UserPreferences"
export { default as AudienceSegment } from "./AudienceSegment"
export { default as Conversation } from "./Conversation"
export { default as Message } from "./Message"
export { default as Purchase } from "./Purchase"