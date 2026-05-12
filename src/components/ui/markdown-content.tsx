import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Tables
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50 text-left">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1.5 font-medium text-muted-foreground">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border-t border-border px-2 py-1.5">{children}</td>
        ),
        tr: ({ children }) => <tr className="hover:bg-muted/30">{children}</tr>,

        // Text elements
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,

        // Lists
        ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-xs">{children}</li>,

        // Headings
        h1: ({ children }) => <h1 className="mb-1.5 text-sm font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1 text-sm font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-xs font-semibold">{children}</h3>,
        h4: ({ children }) => <h4 className="mb-0.5 text-xs font-medium">{children}</h4>,

        // Code
        code: ({ children, className }) => {
          const isBlock = className?.startsWith('language-')
          if (isBlock) {
            return (
              <pre className="my-2 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                <code>{children}</code>
              </pre>
            )
          }
          return (
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
          )
        },

        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/30 pl-3 text-muted-foreground italic">
            {children}
          </blockquote>
        ),

        // Horizontal rule
        hr: () => <hr className="my-3 border-border" />,

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
