'use client'

import { useMemo } from 'react'
import DOMPurify from 'isomorphic-dompurify'

interface MarkdownRendererProps {
    content: string
    className?: string
}

// Simple markdown parser instead of using the 'marked' library  
function parseMarkdown(markdown: string): string {
    let html = markdown
        // Headers (h1-h6)
        .replace(/^######\s(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s(.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Code (inline)
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Links
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Lists (unordered)
        .replace(/^\*\s(.+)$/gm, '<li>$1</li>')
        .replace(/^-\s(.+)$/gm, '<li>$1</li>')
        // Lists (ordered)
        .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
        // Blockquotes
        .replace(/^>\s(.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr>')
        .replace(/^\*\*\*$/gm, '<hr>')

    return html
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const renderedContent = useMemo(() => {
        if (!content) return ''

        try {
            // Parse markdown to HTML using simple parser
            const html = parseMarkdown(content)

            // Enhance the HTML with better styling
            const styledHtml = html
                // Headers
                .replace(/<h1>/g, '<h1 class="text-2xl font-bold text-foreground mb-4 mt-8">')
                .replace(/<h2>/g, '<h2 class="text-xl font-semibold text-foreground mb-4 mt-6">')
                .replace(/<h3>/g, '<h3 class="text-lg font-semibold text-foreground mb-3 mt-4">')
                .replace(/<h4>/g, '<h4 class="text-base font-semibold text-foreground mb-2 mt-3">')
                .replace(/<h5>/g, '<h5 class="text-sm font-semibold text-foreground mb-2 mt-2">')
                .replace(/<h6>/g, '<h6 class="text-xs font-semibold text-foreground mb-2 mt-2">')
                // Lists
                .replace(/<li>/g, '<li class="text-foreground mb-1">')
                // Links
                .replace(/<a /g, '<a class="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" ')
                // Inline code
                .replace(/<code>/g, '<code class="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">')
                // Blockquotes
                .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-primary pl-4 py-2 mb-4 bg-muted/50 rounded-r-lg text-muted-foreground italic">')
                // Horizontal rule
                .replace(/<hr>/g, '<hr class="border-border my-8" />')
                .replace(/<hr\/>/g, '<hr class="border-border my-8" />')
                // Strong and emphasis
                .replace(/<strong>/g, '<strong class="font-semibold text-foreground">')
                .replace(/<em>/g, '<em class="italic text-foreground">')

            // Sanitize HTML to prevent XSS
            return DOMPurify.sanitize(styledHtml)
        } catch (error) {
            console.error('Error parsing markdown:', error)
            // Fallback to simple text rendering
            return DOMPurify.sanitize(content.replace(/\n/g, '<br>'))
        }
    }, [content])

    return (
        <div
            className={`prose prose-sm max-w-none ${className}`}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
    )
}