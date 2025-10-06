'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { 
  Eye, 
  EyeOff, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link, 
  Heading1, 
  Heading2, 
  Heading3 
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your content...',
  label,
  required = false,
  className = ''
}: RichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Helper function to insert text at cursor position
  const insertAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    
    onChange(newText)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  // Formatting functions
  const formatBold = () => insertAtCursor('**', '**')
  const formatItalic = () => insertAtCursor('*', '*')
  const formatH1 = () => insertAtCursor('# ')
  const formatH2 = () => insertAtCursor('## ')
  const formatH3 = () => insertAtCursor('### ')
  const formatBulletList = () => insertAtCursor('- ')
  const formatNumberedList = () => insertAtCursor('1. ')
  const formatLink = () => insertAtCursor('[', '](url)')

  const toolbarButtons = [
    { icon: Heading1, onClick: formatH1, title: 'Heading 1' },
    { icon: Heading2, onClick: formatH2, title: 'Heading 2' },
    { icon: Heading3, onClick: formatH3, title: 'Heading 3' },
    { icon: Bold, onClick: formatBold, title: 'Bold' },
    { icon: Italic, onClick: formatItalic, title: 'Italic' },
    { icon: List, onClick: formatBulletList, title: 'Bullet List' },
    { icon: ListOrdered, onClick: formatNumberedList, title: 'Numbered List' },
    { icon: Link, onClick: formatLink, title: 'Link' },
  ]

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">
            {label} {required && '*'}
            <span className="text-xs text-muted-foreground ml-1">
              (Markdown editor with formatting toolbar)
            </span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>
      )}
      
      {showPreview ? (
        <div className="min-h-[200px] border rounded-md p-4 bg-background">
          <MarkdownRenderer content={value} />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/50">
            {toolbarButtons.map((button, index) => (
              <Button
                key={index}
                type="button"
                variant="ghost"
                size="sm"
                onClick={button.onClick}
                title={button.title}
                className="h-8 w-8 p-0"
              >
                <button.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          
          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[200px] font-mono text-sm"
            required={required}
          />
          
          {/* Help Text */}
          <div className="text-xs text-muted-foreground">
            Use the toolbar buttons or type Markdown directly. 
            <span className="ml-2">
              **bold** *italic* # heading - list [link](url)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}