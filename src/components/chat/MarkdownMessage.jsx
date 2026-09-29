import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import './MarkdownMessage.css';

/**
 * Format inline markdown tokens: **bold**, *italic*, `code`, and [links](url)
 */
function formatInline(text) {
  if (!text) return null;

  // Tokenize string for code, bold, italic, and links
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="md-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    // Links: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="md-link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

/**
 * Code Block with syntax styling and one-click copy
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{language || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="md-code-copy-btn"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-success" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="md-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Robust markdown block parser supporting:
 * - Code blocks (```lang ... ```)
 * - Headings (###, ##, #)
 * - Blockquotes (> quote)
 * - Ordered & Unordered lists
 * - Markdown tables (| col | col |)
 * - Regular paragraphs with inline formatting
 */
export function MarkdownMessage({ content = '', isStreaming = false }) {
  if (!content) return null;

  const rawLines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < rawLines.length) {
    const startIdx = i;
    const line = rawLines[i];

    // 1. Fenced Code Block: ```lang
    if (line.trim().startsWith('```')) {
      const langMatch = line.trim().match(/^```(\w+)?/);
      const language = langMatch && langMatch[1] ? langMatch[1] : '';
      const codeLines = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      elements.push(
        <CodeBlock
          key={`code-${startIdx}`}
          language={language}
          code={codeLines.join('\n')}
        />
      );
      if (i < rawLines.length) {
        i++; // Skip closing ```
      }
      if (i <= startIdx) i = startIdx + 1;
      continue;
    }

    // 2. Headings: #, ##, ###, ####
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2] || '';
      const HeadingTag = `h${Math.min(level + 1, 4)}`; // Map to h2, h3, h4 for nice proportion
      elements.push(
        <HeadingTag key={`h-${startIdx}`} className={`md-heading md-h${level}`}>
          {formatInline(headingText)}
        </HeadingTag>
      );
      i++;
      continue;
    }

    // 3. Blockquote: > text
    if (line.trim().startsWith('>')) {
      const quoteLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={`quote-${startIdx}`} className="md-blockquote">
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{formatInline(ql)}</p>
          ))}
        </blockquote>
      );
      if (i <= startIdx) i = startIdx + 1;
      continue;
    }

    // 4. Markdown Table: Starts with | and has separator line | --- |
    if (
      line.trim().startsWith('|') &&
      i + 1 < rawLines.length &&
      rawLines[i + 1].includes('---')
    ) {
      const tableRows = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
        tableRows.push(rawLines[i]);
        i++;
      }

      const parseCells = (rowStr) =>
        rowStr
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

      const headers = parseCells(tableRows[0] || '');
      const bodyRows = tableRows.slice(2).map(parseCells);

      elements.push(
        <div key={`tbl-${startIdx}`} className="md-table-wrapper">
          <table className="md-table">
            <thead>
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx}>{formatInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((r, rIdx) => (
                <tr key={rIdx}>
                  {r.map((c, cIdx) => (
                    <td key={cIdx}>{formatInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      if (i <= startIdx) i = startIdx + 1;
      continue;
    }

    // 5. Unordered List: - item or * item
    if (/^\s*[-*•]\s+/.test(line)) {
      const listItems = [];
      while (i < rawLines.length && /^\s*[-*•]\s+/.test(rawLines[i])) {
        const itemText = rawLines[i].replace(/^\s*[-*•]\s+/, '');
        listItems.push(itemText);
        i++;
      }
      elements.push(
        <ul key={`ul-${startIdx}`} className="md-list md-ul">
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      if (i <= startIdx) i = startIdx + 1;
      continue;
    }

    // 6. Ordered List: 1. item, 2. item
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems = [];
      while (i < rawLines.length && /^\s*\d+\.\s+/.test(rawLines[i])) {
        const itemText = rawLines[i].replace(/^\s*\d+\.\s+/, '');
        listItems.push(itemText);
        i++;
      }
      elements.push(
        <ol key={`ol-${startIdx}`} className="md-list md-ol">
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
        </ol>
      );
      if (i <= startIdx) i = startIdx + 1;
      continue;
    }

    // 7. Regular paragraph / text block (group consecutive non-empty lines)
    if (line.trim().length > 0) {
      const paraLines = [];
      while (
        i < rawLines.length &&
        rawLines[i].trim().length > 0 &&
        !rawLines[i].trim().startsWith('```') &&
        !rawLines[i].match(/^(#{1,4})\s+/) &&
        !rawLines[i].trim().startsWith('>') &&
        !/^\s*[-*•]\s+/.test(rawLines[i]) &&
        !/^\s*\d+\.\s+/.test(rawLines[i]) &&
        !(rawLines[i].trim().startsWith('|') && i + 1 < rawLines.length && rawLines[i + 1].includes('---'))
      ) {
        paraLines.push(rawLines[i]);
        i++;
      }

      if (paraLines.length === 0) {
        paraLines.push(rawLines[i]);
        i++;
      }

      elements.push(
        <p key={`p-${startIdx}`} className="md-paragraph">
          {paraLines.map((pl, plIdx) => (
            <React.Fragment key={plIdx}>
              {formatInline(pl)}
              {plIdx < paraLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
      if (i <= startIdx) i = startIdx + 1;
      continue;
    }

    // Empty line, advance
    i++;
    if (i <= startIdx) {
      i = startIdx + 1;
    }
  }

  return (
    <div className="md-rendered-content">
      {elements}
      {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  );
}

export default MarkdownMessage;
