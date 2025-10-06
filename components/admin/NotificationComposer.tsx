'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import RichTextEditor from '@/components/ui/rich-text-editor'
import AudienceTargeting from './AudienceTargeting'
import ChannelSelector from './ChannelSelector'
import { 
  Send, 
  Save, 
  Eye, 
  Users, 
  Calendar, 
  MessageSquare,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Types based on the design document
export interface NotificationDraft {
  title: string
  content: {
    [channel: string]: {
      message: string
      subject?: string
      attachments?: string[]
    }
  }
  targeting: TargetingCriteria
  channels: NotificationChannel[]
  scheduling?: SchedulingOptions
  template?: {
    id: string
    saveAsNew?: boolean
  }
}

export interface TargetingCriteria {
  roles: string[]
  locations?: string[]
  activityStatus?: 'active' | 'inactive' | 'new'
  customSegments?: string[]
  logic: 'AND' | 'OR'
  excludeOptedOut: boolean
}

export type NotificationChannel = 'web_push' | 'email' | 'whatsapp' | 'sms'

export interface SchedulingOptions {
  type: 'immediate' | 'scheduled' | 'recurring'
  scheduledFor?: Date
  timezone?: string
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    endDate?: Date
  }
}

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

interface NotificationComposerProps {
  mode: 'create' | 'edit' | 'emergency'
  templateId?: string
  initialData?: Partial<NotificationDraft>
  onSave: (notification: NotificationDraft) => void
  onSend: (notification: NotificationDraft) => void
  onCancel?: () => void
}

// Channel configurations
const CHANNEL_CONFIGS: Record<NotificationChannel, ChannelConfig> = {
  web_push: {
    channel: 'web_push',
    isAvailable: true,
    configStatus: 'ok',
    limitations: {
      maxLength: 160,
      supportsRichText: false,
      supportsAttachments: true
    }
  },
  email: {
    channel: 'email',
    isAvailable: true,
    configStatus: 'ok',
    limitations: {
      maxLength: 10000,
      supportsRichText: true,
      supportsAttachments: true
    }
  },
  whatsapp: {
    channel: 'whatsapp',
    isAvailable: true,
    configStatus: 'warning',
    limitations: {
      maxLength: 4096,
      supportsRichText: false,
      supportsAttachments: false
    }
  },
  sms: {
    channel: 'sms',
    isAvailable: false,
    configStatus: 'error',
    limitations: {
      maxLength: 160,
      supportsRichText: false,
      supportsAttachments: false
    }
  }
}

export default function NotificationComposer({
  mode = 'create',
  templateId,
  initialData,
  onSave,
  onSend,
  onCancel
}: NotificationComposerProps) {
  const [activeTab, setActiveTab] = useState('content')
  const [draft, setDraft] = useState<NotificationDraft>({
    title: '',
    content: {},
    targeting: {
      roles: [],
      logic: 'AND',
      excludeOptedOut: true
    },
    channels: ['web_push'],
    ...initialData
  })
  
  const [audienceCount, setAudienceCount] = useState<number>(0)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [audiencePreview, setAudiencePreview] = useState<any>(null)

  // Initialize content for selected channels
  useEffect(() => {
    const newContent = { ...draft.content }
    draft.channels.forEach(channel => {
      if (!newContent[channel]) {
        newContent[channel] = {
          message: '',
          subject: channel === 'email' ? '' : undefined
        }
      }
    })
    
    // Remove content for unselected channels
    Object.keys(newContent).forEach(channel => {
      if (!draft.channels.includes(channel as NotificationChannel)) {
        delete newContent[channel]
      }
    })
    
    if (JSON.stringify(newContent) !== JSON.stringify(draft.content)) {
      setDraft(prev => ({ ...prev, content: newContent }))
    }
  }, [draft.channels])

  // Validation
  const validateDraft = (): Record<string, string> => {
    const newErrors: Record<string, string> = {}
    
    if (!draft.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (draft.channels.length === 0) {
      newErrors.channels = 'At least one channel must be selected'
    }
    
    if (draft.targeting.roles.length === 0) {
      newErrors.targeting = 'At least one role must be selected'
    }
    
    // Validate content for each channel
    draft.channels.forEach(channel => {
      const channelContent = draft.content[channel]
      const config = CHANNEL_CONFIGS[channel]
      
      if (!channelContent?.message.trim()) {
        newErrors[`content_${channel}`] = `Message is required for ${channel}`
      } else if (config.limitations.maxLength && channelContent.message.length > config.limitations.maxLength) {
        newErrors[`content_${channel}`] = `Message exceeds ${config.limitations.maxLength} characters for ${channel}`
      }
      
      if (channel === 'email' && !channelContent?.subject?.trim()) {
        newErrors[`subject_${channel}`] = 'Subject is required for email'
      }
    })
    
    return newErrors
  }

  const handleSave = () => {
    const validationErrors = validateDraft()
    setErrors(validationErrors)
    
    if (Object.keys(validationErrors).length === 0) {
      onSave(draft)
    }
  }

  const handleSend = () => {
    const validationErrors = validateDraft()
    setErrors(validationErrors)
    
    if (Object.keys(validationErrors).length === 0) {
      onSend(draft)
    }
  }

  const updateDraft = (updates: Partial<NotificationDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }))
  }

  const updateContent = (channel: NotificationChannel, field: string, value: string) => {
    setDraft(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [channel]: {
          ...prev.content[channel],
          [field]: value
        }
      }
    }))
  }

  const handleChannelContentChange = (channel: NotificationChannel, content: any) => {
    setDraft(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [channel]: content
      }
    }))
  }

  const handleChannelToggle = (channel: NotificationChannel) => {
    const newChannels = draft.channels.includes(channel)
      ? draft.channels.filter(c => c !== channel)
      : [...draft.channels, channel]
    
    updateDraft({ channels: newChannels })
  }

  const handleAudiencePreviewUpdate = (preview: any) => {
    setAudiencePreview(preview)
    setAudienceCount(preview.effectiveAudience || 0)
  }

  const getCharacterCount = (channel: NotificationChannel, field: 'message' | 'subject' = 'message'): number => {
    const content = draft.content[channel]
    if (!content) return 0
    
    if (field === 'message') return content.message?.length || 0
    if (field === 'subject') return content.subject?.length || 0
    
    return 0
  }

  const getCharacterLimit = (channel: NotificationChannel): number => {
    return CHANNEL_CONFIGS[channel].limitations.maxLength || 0
  }

  const isEmergencyMode = mode === 'emergency'

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isEmergencyMode ? 'Emergency Notification' : 
             mode === 'edit' ? 'Edit Notification' : 'Create Notification'}
          </h1>
          <p className="text-muted-foreground">
            {isEmergencyMode ? 'Send urgent notifications to all users immediately' :
             'Compose and send notifications to targeted user groups'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
          
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          
          <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4 mr-2" />
            {isEmergencyMode ? 'Send Emergency' : 'Send Notification'}
          </Button>
        </div>
      </div>

      {/* Emergency Mode Alert */}
      {isEmergencyMode && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Emergency mode: This notification will be sent immediately to all users through all available channels.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Composer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notification Composer
                </CardTitle>
                
                {audienceCount > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {audienceCount.toLocaleString()} recipients
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="targeting" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Targeting
                  </TabsTrigger>
                  <TabsTrigger value="scheduling" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Scheduling
                  </TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-6 mt-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Notification Title *</Label>
                    <Input
                      id="title"
                      value={draft.title}
                      onChange={(e) => updateDraft({ title: e.target.value })}
                      placeholder="Enter notification title..."
                      className={errors.title ? 'border-red-500' : ''}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  {/* Channel Selector */}
                  <ChannelSelector
                    selectedChannels={draft.channels}
                    availableChannels={Object.values(CHANNEL_CONFIGS)}
                    content={draft.content}
                    onChannelToggle={handleChannelToggle}
                    onContentChange={handleChannelContentChange}
                  />
                </TabsContent>

                {/* Targeting Tab */}
                <TabsContent value="targeting" className="space-y-6 mt-6">
                  <AudienceTargeting
                    criteria={draft.targeting}
                    onCriteriaChange={(criteria) => updateDraft({ targeting: criteria })}
                    previewCount={audienceCount}
                    channels={draft.channels}
                    onPreviewUpdate={handleAudiencePreviewUpdate}
                  />
                </TabsContent>

                {/* Scheduling Tab - Placeholder for now */}
                <TabsContent value="scheduling" className="space-y-6 mt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Scheduling interface will be implemented in task 6</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {draft.channels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select channels to see preview</p>
                </div>
              ) : (
                draft.channels.map(channel => (
                  <div key={channel} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm capitalize">
                        {channel.replace('_', ' ')} Preview
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      {channel === 'email' && draft.content[channel]?.subject && (
                        <div className="font-medium text-sm">
                          Subject: {draft.content[channel].subject}
                        </div>
                      )}
                      
                      <div className="text-sm">
                        {draft.content[channel]?.message || (
                          <span className="text-muted-foreground italic">
                            No message content
                          </span>
                        )}
                      </div>
                      
                      {draft.content[channel]?.message && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3" />
                          {getCharacterCount(channel)} characters
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}