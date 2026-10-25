import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import csharp from 'highlight.js/lib/languages/csharp'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import http from 'highlight.js/lib/languages/http'
import ini from 'highlight.js/lib/languages/ini'
import nginx from 'highlight.js/lib/languages/nginx'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'

// Only the languages the duel challenges and the lessons use (see backend/Questions), to keep the bundle small
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('http', http)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('nginx', nginx)
hljs.registerLanguage('python', python)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('yaml', yaml)

// Names used in the challenge files that highlight.js knows under another name
const ALIASES: Record<string, string> = {
  tsx: 'typescript',
  ts: 'typescript',
  javascript: 'typescript',
  js: 'typescript',
  jsx: 'typescript',
  dotenv: 'ini',
  env: 'ini',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  cs: 'csharp',
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// highlight.js returns one HTML string, and a token such as a block comment can span several lines.
// Each line closes the spans still open at its end and reopens them on the next, so lines render on their own.
function splitLines(html: string) {
  const lines: string[] = []
  const open: string[] = []
  let current = ''

  for (const match of html.matchAll(/(<span[^>]*>)|(<\/span>)|(\n)|([^<\n]+)/g)) {
    const [, openTag, closeTag, newline, text] = match
    if (openTag) {
      current += openTag
      open.push(openTag)
    } else if (closeTag) {
      current += closeTag
      open.pop()
    } else if (newline) {
      lines.push(current + '</span>'.repeat(open.length))
      current = open.join('')
    } else if (text) {
      current += text
    }
  }
  lines.push(current + '</span>'.repeat(open.length))
  return lines
}

// One HTML string per line of code. The text is escaped by highlight.js (or here), so it is safe to inject.
export function highlightLines(code: string, language?: string): string[] {
  const name = language ? (ALIASES[language.toLowerCase()] ?? language.toLowerCase()) : undefined
  if (!name || !hljs.getLanguage(name)) return code.split('\n').map(escapeHtml)
  return splitLines(hljs.highlight(code, { language: name, ignoreIllegals: true }).value)
}
