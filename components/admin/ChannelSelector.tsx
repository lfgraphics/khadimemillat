'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Bell,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  Settings,
  Info
} from 'lucide-react'
import { EnhancedFileSelector } from '@/components/file-selector'
import type { UploadResult } from '@/components/file-selector/types'

export type NotificationChannel = 'web_push' | 'email' | 'whatsapp' | 'sms'

export interface ChannelConfig {
  channel: NotificationChannel
  isAvailable: boolean
  configStatus: 'ok' | 'warning' | 'error'
  limitations: {
    maxLength?: number
    supportsRichText: boolean
    supportsAttachments: boolean
  }
  statusMessage?: string
}

export interface ChannelContent {
  message: string
  subject?: string
  attachments?: string[]
}

interface ChannelSelectorProps {
  selectedChannels: NotificationChannel[]
  availableChannels: ChannelConfig[]
  content: Record<string, ChannelContent>
  onChannelToggle: (channel: NotificationChannel) => void
  onContentChange: (channel: NotificationChannel, content: ChannelContent) => void
  onChannelConfig?: (channel: NotificationChannel, config: any) => void
  className?: string
}

// Default channel configurations
const DEFAULT_CHANNEL_CONFIGS: Record<NotificationChannel, ChannelConfig> = {
  web_push: {
    channel: 'web_push',
    isAvailable: true,
    configStatus: 'ok',
    limitations: {
      maxLength: 160,
      supportsRichText: false,
      supportsAttachments: true
    },
    statusMessage: 'Web push notifications are configured and ready'
  },
  email: {
    channel: 'email',
    isAvailable: true,
    configStatus: 'ok',
    limitations: {
      maxLength: 10000,
      supportsRichText: true,
      supportsAttachments: true
    },
    statusMessage: 'Email service is configured and ready'
  },
  whatsapp: {
    channel: 'whatsapp',
    isAvailable: true,
    configStatus: 'warning',
    limitations: {
      maxLength: 4096,
      supportsRichText: false,
      supportsAttachments: false
    },
    statusMessage: 'WhatsApp API has rate limits - use sparingly'
  },
  sms: {
    channel: 'sms',
    isAvailable: false,
    configStatus: 'error',
    limitations: {
      maxLength: 160,
      supportsRichText: false,
      supportsAttachments: false
    },
    statusMessage: 'SMS service not configured - contact administrator'
  }
}

// Channel icons and metadata
const CHANNEL_METADATA = {
  web_push: {
    icon: Bell,
    name: 'Web Push',
    description: 'Browser notifications',
    color: 'text-blue-600'
  },
  email: {
    icon: Mail,
    name: 'Email',
    description: 'Email notifications',
    color: 'text-green-600'
  },
  whatsapp: {
    icon: MessageSquare,
    name: 'WhatsApp',
    description: 'WhatsApp messages',
    color: 'text-green-500'
  },
  sms: {
    icon: Phone,
    name: 'SMS',
    description: 'Text messages',
    color: 'text-purple-600'
  }
}

export default function ChannelSelector({
  selectedChannels,
  availableChannels,
  content,
  onChannelToggle,
  onContentChange,
  onChannelConfig,
  className = ''
}: ChannelSelectorProps) {
  const [expandedChannel, setExpandedChannel] = useState<NotificationChannel | null>(null)

  // Use provided configs or fall back to defaults
  const channelConfigs = availableChannels.length > 0 
    ? availableChannels.reduce((acc, config) => {
        acc[config.channel] = config
        return acc
      }, {} as Record<NotificationChannel, ChannelConfig>)
    : DEFAULT_CHANNEL_CONFIGS

  // Get status icon based on config status
  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  // Get character count for a channel
  const getCharacterCount = (channel: NotificationChannel, field: 'message' | 'subject' = 'message'): number => {
    return content[channel]?.[field]?.length || 0
  }

  // Update content for a specific channel
  const updateChannelContent = (channel: NotificationChannel, field: keyof ChannelContent, value: string) => {
    const currentContent = content[channel] || { message: '' }
    const updatedContent = { ...currentContent, [field]: value }
    onContentChange(channel, updatedContent)
  }

  // Handle attachment upload (placeholder)
  const handleAttachmentUploaded = (channel: NotificationChannel) => (upload: UploadResult) => {
    const currentContent = content[channel] || { message: '' }
    const url = upload.secureUrl || upload.url || upload.publicId || ''
    if (!url) return
    const updatedContent = {
      ...currentContent,
      attachments: [...(currentContent.attachments || []), url]
    }
    onContentChange(channel, updatedContent)
  }

  // Remove attachment
  const removeAttachment = (channel: NotificationChannel, attachmentIndex: number) => {
    const currentContent = content[channel] || { message: '' }
    const updatedAttachments = currentContent.attachments?.filter((_, index) => index !== attachmentIndex) || []
    const updatedContent = { ...currentContent, attachments: updatedAttachments }
    onContentChange(channel, updatedContent)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Channel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Select Notification Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(channelConfigs).map(([channelKey, config]) => {
              const channel = channelKey as NotificationChannel
              const metadata = CHANNEL_METADATA[channel]
              const Icon = metadata.icon
              const isSelected = selectedChannels.includes(channel)
              const isDisabled = !config.isAvailable

              return (
                <div
                  key={channel}
                  className={`p-4 border rounded-lg transition-colors ${
                    isSelected && !isDisabled
                      ? 'border-blue-500 bg-blue-50'
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-60'
                      : 'hoact:bg-muted/50 cursor-pointer'
                  }`}
                  onClick={() => !isDisabled && onChannelToggle(channel)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && onChannelToggle(channel)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-5 w-5 ${metadata.color}`} />
                        <span className="font-medium">{metadata.name}</span>
                        {getStatusIcon(config.configStatus)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {metadata.description}
                      </p>
                      
                      {/* Channel limitations */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Info className="h-3 w-3" />
                          Max: {config.limitations.maxLength || 'Unlimited'} chars
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {config.limitations.supportsRichText && (
                            <Badge variant="outline" className="text-xs">Rich Text</Badge>
                          )}
                          {config.limitations.supportsAttachments && (
                            <Badge variant="outline" className="text-xs">Attachments</Badge>
                          )}
                        </div>
                      </div>

                      {/* Status message */}
                      {config.statusMessage && (
                        <p className={`text-xs mt-2 ${
                          config.configStatus === 'ok' ? 'text-green-600' :
                          config.configStatus === 'warning' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {config.statusMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedChannels.length === 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select at least one notification channel.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Channel Content Configuration */}
      {selectedChannels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Channel Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedChannels.map(channel => {
              const config = channelConfigs[channel]
              const metadata = CHANNEL_METADATA[channel]
              const Icon = metadata.icon
              const channelContent = content[channel] || { message: '' }
              const isExpanded = expandedChannel === channel

              return (
                <div key={channel} className="space-y-4">
                  {/* Channel Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${metadata.color}`} />
                      <h3 className="font-medium">{metadata.name}</h3>
                      {getStatusIcon(config.configStatus)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getCharacterCount(channel)} / {config.limitations.maxLength || '∞'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedChannel(isExpanded ? null : channel)}
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                  </div>

                  {/* Channel Content Form */}
                  <div className="space-y-4 pl-7">
                    {/* Email Subject */}
                    {channel === 'email' && (
                      <div className="space-y-2">
                        <Label htmlFor={`subject-${channel}`}>Subject *</Label>
                        <Input
                          id={`subject-${channel}`}
                          value={channelContent.subject || ''}
                          onChange={(e) => updateChannelContent(channel, 'subject', e.target.value)}
                          placeholder="Email subject..."
                          maxLength={100}
                        />
                        <div className="text-xs text-muted-foreground">
                          {getCharacterCount(channel, 'subject')} / 100 characters
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="space-y-2">
                      <Label htmlFor={`message-${channel}`}>Message *</Label>
                      {config.limitations.supportsRichText ? (
                        <RichTextEditor
                          value={channelContent.message}
                          onChange={(value) => updateChannelContent(channel, 'message', value)}
                          placeholder={`Enter ${metadata.name.toLowerCase()} message...`}
                        />
                      ) : (
                        <Textarea
                          id={`message-${channel}`}
                          value={channelContent.message}
                          onChange={(e) => updateChannelContent(channel, 'message', e.target.value)}
                          placeholder={`Enter ${metadata.name.toLowerCase()} message...`}
                          rows={4}
                          maxLength={config.limitations.maxLength}
                          className="resize-none"
                        />
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {getCharacterCount(channel)} / {config.limitations.maxLength || '∞'} characters
                        </span>
                        {config.limitations.maxLength && getCharacterCount(channel) > config.limitations.maxLength && (
                          <span className="text-red-600">
                            Exceeds limit by {getCharacterCount(channel) - config.limitations.maxLength}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attachments */}
                    {config.limitations.supportsAttachments && isExpanded && (
                      <div className="space-y-2">
                        <Label>Attachments (Optional)</Label>
                        
                        {/* Upload using EnhancedFileSelector */}
                        <div className="flex items-center gap-3">
                          <EnhancedFileSelector
                            onFileSelect={() => {}}
                            onUploadComplete={handleAttachmentUploaded(channel)}
                            onError={() => { /* handled by toast inside component */ }}
                            maxFileSize={10 * 1024 * 1024}
                            acceptedTypes={channel === 'email' ? ['image/jpeg','image/png','image/webp','application/pdf'] : ['image/jpeg','image/png','image/webp']}
                            placeholder={channel === 'email' ? 'Add attachment' : 'Add image'}
                            showPreview={false}
                            uploadToCloudinary={true}
                            cloudinaryOptions={{
                              folder: `kmwf/notifications/${channel}`,
                              tags: ['notification-attachment', channel]
                            }}
                            className="min-w-[160px] h-10 rounded px-3 flex items-center justify-center text-sm bg-muted/40 hoact:bg-muted/60"
                          />
                          <span className="text-xs text-muted-foreground">
                            {channel === 'email' ? 'Images/PDF' : 'Images only'}
                          </span>
                        </div>

                        {/* Attachment List */}
                        {channelContent.attachments && channelContent.attachments.length > 0 && (
                          <div className="space-y-2">
                            {channelContent.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-muted rounded"
                              >
                                <span className="text-sm truncate">
                                  {attachment.replace('attachment://', '')}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(channel, index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Channel-specific warnings */}
                    {channel === 'whatsapp' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          WhatsApp has strict rate limits. Avoid sending bulk messages to prevent account suspension.
                        </AlertDescription>
                      </Alert>
                    )}

                    {channel === 'sms' && !config.isAvailable && (
                      <Alert>
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          SMS service is not configured. Contact your administrator to enable SMS notifications.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {selectedChannels.indexOf(channel) < selectedChannels.length - 1 && (
                    <Separator />
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}