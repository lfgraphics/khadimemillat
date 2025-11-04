'use client'

import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

interface MarkdownRendererProps {
    content: string
    className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const renderedContent = useMemo(() => {
        if (!content) return ''

        try {
            // Configure marked options
            marked.setOptions({
                breaks: true,
                gfm: true,
            })

            // Parse markdown to HTML
            const html = marked.parse(content) as string

            // Enhance the HTML with better styling
            const styledHtml = html
                // Headers
                .replace(/<h1>/g, '<h1 class="text-2xl font-bold text-foreground mb-4 mt-8">')
                .replace(/<h2>/g, '<h2 class="text-xl font-semibold text-foreground mb-4 mt-6">')
                .replace(/<h3>/g, '<h3 class="text-lg font-semibold text-foreground mb-3 mt-4">')
                .replace(/<h4>/g, '<h4 class="text-base font-semibold text-foreground mb-2 mt-3">')
                .replace(/<h5>/g, '<h5 class="text-sm font-semibold text-foreground mb-2 mt-2">')
                .replace(/<h6>/g, '<h6 class="text-xs font-semibold text-foreground mb-2 mt-2">')
                
                // Paragraphs
                .replace(/<p>/g, '<p class="text-foreground mb-4 leading-relaxed">')
                
                // Lists
                .replace(/<ul>/g, '<ul class="list-disc list-inside mb-4 space-y-2 pl-4">')
                .replace(/<ol>/g, '<ol class="list-decimal list-inside mb-4 space-y-2 pl-4">')
                .replace(/<li>/g, '<li class="text-foreground">')
                
                // Links
                .replace(/<a href="/g, '<a href="')
                .replace(/<a /g, '<a class="text-primary hoact:text-primary/80 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" ')
                
                // Code blocks
                .replace(/<pre><code>/g, '<pre class="bg-muted p-4 rounded-lg mb-4 overflow-x-auto"><code class="text-sm font-mono text-foreground">')
                
                // Inline code
                .replace(/<code>/g, '<code class="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">')
                
                // Blockquotes
                .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-primary pl-4 py-2 mb-4 bg-muted/50 rounded-r-lg"><div class="text-muted-foreground italic">')
                .replace(/<\/blockquote>/g, '</div></blockquote>')
                
                // Tables
                .replace(/<table>/g, '<div class="overflow-x-auto mb-4"><table class="min-w-full border border-border rounded-lg">')
                .replace(/<\/table>/g, '</table></div>')
                .replace(/<tr>/g, '<tr class="border-b border-border">')
                .replace(/<th>/g, '<th class="px-4 py-2 bg-muted font-semibold text-left text-foreground">')
                .replace(/<td>/g, '<td class="px-4 py-2 text-foreground">')
                
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