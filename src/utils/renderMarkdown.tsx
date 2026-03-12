import { ReactNode } from 'react';

/**
 * Safe markdown-like renderer. Converts **bold** to <strong> without dangerouslySetInnerHTML.
 * Handles: # headings, ## subheadings, numbered lists, **bold**, blank lines.
 */
function renderBoldText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function renderMarkdownContent(content: string): ReactNode[] {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return <h2 key={i} className="text-xl font-bold mb-3">{line.substring(2)}</h2>;
    } else if (line.startsWith('## ')) {
      return <h3 key={i} className="text-lg font-semibold mb-2">{line.substring(3)}</h3>;
    } else if (line.match(/^\d+\./)) {
      return <p key={i} className="ml-4 mb-1">{renderBoldText(line)}</p>;
    } else if (line.trim() === '') {
      return <br key={i} />;
    } else {
      return <p key={i} className="mb-2">{renderBoldText(line)}</p>;
    }
  });
}
