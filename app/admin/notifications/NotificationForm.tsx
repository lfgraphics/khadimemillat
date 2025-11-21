'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Send,
    Mail,
    MessageSquare,
    Smartphone,
    Globe,
    Users,
    Eye,
    CheckCircle,
    XCircle,
    Loader2,
    FileText,
    Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

interface NotificationFormProps {
    onNotificationSent?: () => void
}

interface SendingProgress {
    total: number
    sent: number
    failed: number
    inProgress: boolean
}

interface NotificationTemplate {
    _id: string
    name: string
    title: string
    message: string
    channels: string[]
    targetRoles: string[]
    category: string
}

export default function NotificationForm({ onNotificationSent }: NotificationFormProps) {
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [selectedChannels, setSelectedChannels] = useState<string[]>(['web_push'])
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['everyone'])
    const [showPreview, setShowPreview] = useState(false)
    const [sending, setSending] = useState(false)
    const [sendingProgress, setSendingProgress] = useState<SendingProgress | null>(null)
    const [lastResult, setLastResult] = useState<any>(null)
    const [templates, setTemplates] = useState<NotificationTemplate[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [loadingTemplates, setLoadingTemplates] = useState(false)

    const channels = [
        { id: 'web_push', label: 'Web Push', icon: Globe, description: 'Browser notifications' },
        { id: 'email', label: 'Email', icon: Mail, description: 'Email notifications' },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'WhatsApp messages' },
        { id: 'sms', label: 'SMS', icon: Smartphone, description: 'Text messages' }
    ]

    const roles = [
        { id: 'everyone', label: 'Everyone', description: 'All users' },
        { id: 'admin', label: 'Admins', description: 'Administrator users' },
        { id: 'moderator', label: 'Moderators', description: 'Moderator users' },
        { id: 'field_executive', label: 'Field Executive', description: 'Field workers' },
        { id: 'accountant', label: 'accountant', description: 'Accounts manager' },
        { id: 'user', label: 'Users', description: 'Regular users' }
    ]

    useEffect(() => {
        fetchTemplates()
    }, [])

    const fetchTemplates = async () => {
        setLoadingTemplates(true)
        try {
            const response = await fetch('/api/admin/notifications/templates')
            if (response.ok) {
                const data = await response.json()
                setTemplates(data.templates || [])
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error)
        } finally {
            setLoadingTemplates(false)
        }
    }

    const handleChannelChange = (channelId: string, checked: boolean) => {
        if (checked) {
            setSelectedChannels([...selectedChannels, channelId])
        } else {
            setSelectedChannels(selectedChannels.filter(id => id !== channelId))
        }
    }

    const handleRoleChange = (roleId: string, checked: boolean) => {
        if (roleId === 'everyone') {
            if (checked) {
                setSelectedRoles(['everyone'])
            } else {
                setSelectedRoles([])
            }
        } else {
            if (checked) {
                const newRoles = [...selectedRoles.filter(r => r !== 'everyone'), roleId]
                setSelectedRoles(newRoles)
            } else {
                setSelectedRoles(selectedRoles.filter(id => id !== roleId))
            }
        }
    }

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId)
        if (templateId) {
            const template = templates.find(t => t._id === templateId)
            if (template) {
                setTitle(template.title)
                setMessage(template.message)
                setSelectedChannels(template.channels)
                setSelectedRoles(template.targetRoles)
                toast.success('Template applied successfully')
            }
        }
    }

    const handleSaveAsTemplate = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error('Please fill in title and message before saving as template')
            return
        }

        const templateName = prompt('Enter a name for this template:')
        if (!templateName) return

        try {
            const response = await fetch('/api/admin/notifications/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: templateName.trim(),
                    title: title.trim(),
                    message: message.trim(),
                    channels: selectedChannels,
                    targetRoles: selectedRoles,
                    category: 'custom'
                })
            })

            if (response.ok) {
                toast.success('Template saved successfully')
                fetchTemplates() // Refresh templates list
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to save template')
            }
        } catch (error) {
            console.error('Error saving template:', error)
            toast.error('Failed to save template')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim() || !message.trim()) {
            toast.error('Please fill in both title and message')
            return
        }

        if (selectedChannels.length === 0) {
            toast.error('Please select at least one channel')
            return
        }

        if (selectedRoles.length === 0) {
            toast.error('Please select at least one target role')
            return
        }

        setSending(true)
        setSendingProgress({ total: 0, sent: 0, failed: 0, inProgress: true })
        setLastResult(null)

        try {
            const response = await fetch('/api/admin/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title.trim(),
                    message: message.trim(),
                    channels: selectedChannels,
                    targetRoles: selectedRoles,
                    templateId: selectedTemplate || undefined
                })
            })

            const result = await response.json()

            if (response.ok && result.success) {
                const totalSent = Object.values(result.results).reduce((sum: number, channel: any) => sum + channel.sent, 0)
                const totalFailed = Object.values(result.results).reduce((sum: number, channel: any) => sum + channel.failed, 0)

                setSendingProgress({
                    total: result.totalUsers || 0,
                    sent: totalSent,
                    failed: totalFailed,
                    inProgress: false
                })

                setLastResult(result)
                toast.success(`Notification sent successfully! ${totalSent} sent, ${totalFailed} failed`)

                // Increment template usage if a template was used (non-blocking)
                if (selectedTemplate) {
                    try {
                        await fetch(`/api/admin/notifications/templates/${selectedTemplate}/use`, { method: 'POST' })
                    } catch (e) {
                        console.warn('Failed to increment template usage:', e)
                    }
                }

                // Reset form
                setTitle('')
                setMessage('')
                setSelectedChannels(['web_push'])
                setSelectedRoles(['everyone'])
                setSelectedTemplate('')

                // Notify parent component
                onNotificationSent?.()
            } else {
                throw new Error(result.error || 'Failed to send notification')
            }
        } catch (error) {
            console.error('Error sending notification:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to send notification')
            setSendingProgress(null)
        } finally {
            setSending(false)
        }
    }

    const getChannelIcon = (channelId: string) => {
        const channel = channels.find(c => c.id === channelId)
        return channel ? <channel.icon className="h-4 w-4" /> : null
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Send Notification
                    </CardTitle>
                    <CardDescription>
                        Send notifications to users across multiple channels
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Template Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Template</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSaveAsTemplate}
                                    disabled={sending}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Save as Template
                                </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Or manage all templates in{' '}
                                <Link href="/admin/notifications/templates" className="underline">Templates</Link>
                            </div>
                            <Select value={selectedTemplate} onValueChange={handleTemplateSelect} disabled={sending}>
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select a template (optional)"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-templates">No template</SelectItem>
                                    {templates.map((template) => (
                                        <SelectItem key={template._id} value={template._id}>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                <span>{template.name}</span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {template.category}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedTemplate && (
                                <div className="text-sm text-muted-foreground">
                                    Template applied. You can customize the content below before sending.
                                </div>
                            )}
                        </div>

                        {/* Title and Message */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter notification title"
                                    disabled={sending}
                                />
                            </div>

                            <div>
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Enter notification message"
                                    rows={4}
                                    disabled={sending}
                                />
                            </div>
                        </div>

                        {/* Channel Selection */}
                        <div>
                            <Label className="text-base font-medium">Channels</Label>
                            <p className="text-sm text-muted-foreground mb-3">
                                Select which channels to send the notification through
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {channels.map((channel) => (
                                    <div key={channel.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                        <Checkbox
                                            id={channel.id}
                                            checked={selectedChannels.includes(channel.id)}
                                            onCheckedChange={(checked) => handleChannelChange(channel.id, !!checked)}
                                            disabled={sending}
                                        />
                                        <div className="flex items-center space-x-2 flex-1">
                                            <channel.icon className="h-4 w-4" />
                                            <div>
                                                <Label htmlFor={channel.id} className="font-medium cursor-pointer">
                                                    {channel.label}
                                                </Label>
                                                <p className="text-xs text-muted-foreground">{channel.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <Label className="text-base font-medium">Target Roles</Label>
                            <p className="text-sm text-muted-foreground mb-3">
                                Select which user roles should receive the notification
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {roles.map((role) => (
                                    <div key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                        <Checkbox
                                            id={role.id}
                                            checked={selectedRoles.includes(role.id)}
                                            onCheckedChange={(checked) => handleRoleChange(role.id, !!checked)}
                                            disabled={sending}
                                        />
                                        <div className="flex items-center space-x-2 flex-1">
                                            <Users className="h-4 w-4" />
                                            <div>
                                                <Label htmlFor={role.id} className="font-medium cursor-pointer">
                                                    {role.label}
                                                </Label>
                                                <p className="text-xs text-muted-foreground">{role.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        {showPreview && title && message && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                        Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="font-medium">{title}</div>
                                        <div className="text-sm text-muted-foreground">{message}</div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {selectedChannels.map((channelId) => (
                                                <Badge key={channelId} variant="secondary" className="text-xs">
                                                    {getChannelIcon(channelId)}
                                                    <span className="ml-1">{channels.find(c => c.id === channelId)?.label}</span>
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedRoles.map((roleId) => (
                                                <Badge key={roleId} variant="outline" className="text-xs">
                                                    <Users className="h-3 w-3 mr-1" />
                                                    {roles.find(r => r.id === roleId)?.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Sending Progress */}
                        {sendingProgress && (
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {sendingProgress.inProgress ? 'Sending...' : 'Completed'}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {sendingProgress.sent + sendingProgress.failed} / {sendingProgress.total}
                                            </span>
                                        </div>
                                        <Progress
                                            value={sendingProgress.total > 0 ? ((sendingProgress.sent + sendingProgress.failed) / sendingProgress.total) * 100 : 0}
                                        />
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600 flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                {sendingProgress.sent} sent
                                            </span>
                                            <span className="text-red-600 flex items-center gap-1">
                                                <XCircle className="h-3 w-3" />
                                                {sendingProgress.failed} failed
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button type="submit" disabled={sending} className="flex-1">
                                {sending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Notification
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowPreview(!showPreview)}
                                disabled={sending}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                {showPreview ? 'Hide' : 'Preview'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}