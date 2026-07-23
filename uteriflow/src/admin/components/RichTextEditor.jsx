import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useCallback } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Unlink,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Minus, Pilcrow,
} from 'lucide-react'

/**
 * RichTextEditor
 * --------------
 * Word-style formatting for article bodies, replacing the old plain <textarea>.
 * The content team can now apply headings, bold, italic, underline, alignment,
 * lists and links without needing a developer.
 *
 * Emits HTML via onChange. The backend sanitises that HTML before storing it
 * and also derives a plain-text copy, so older app builds that read the old
 * plain `content` field keep working unchanged.
 *
 * Note: TipTap v3's StarterKit already bundles Underline and Link, so only
 * TextAlign is registered separately here — registering them twice throws a
 * duplicate-extension warning.
 */
export default function RichTextEditor({ value, onChange, placeholder = 'Write the article…' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'uf-editor-content',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // TipTap represents "empty" as <p></p>; normalise that to '' so an
      // untouched editor doesn't save a stray empty paragraph.
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  // Keep the editor in sync when the parent loads a different article.
  // Guarded against feedback loops: only reset when the incoming value truly
  // differs from what the editor already holds.
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const incoming = value || ''
    if (incoming !== current && !(incoming === '' && current === '<p></p>')) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previous = editor.getAttributes('link').href || ''
    const url = window.prompt('Link URL', previous)
    if (url === null) return                   // cancelled
    if (url === '') {                          // cleared
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    // Default to https:// so "uteriflow.com" doesn't become a broken relative link.
    const href = /^https?:\/\//i.test(url) || url.startsWith('mailto:') ? url : `https://${url}`
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }, [editor])

  if (!editor) {
    return <div style={shell}><div style={{ padding: '20px', fontSize: '13px', color: 'var(--gray-400)' }}>Loading editor…</div></div>
  }

  const Btn = ({ onClick, active, disabled, title, children }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={!!active}
      disabled={disabled}
      onMouseDown={e => e.preventDefault()}   // keep the text selection alive
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '30px', height: '30px', borderRadius: '6px', flexShrink: 0,
        border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'var(--purple-pale)' : 'transparent',
        color: disabled ? 'var(--gray-300)' : active ? 'var(--purple)' : 'var(--gray-600)',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )

  const Sep = () => (
    <span style={{ width: '1px', height: '20px', background: 'var(--gray-200)', margin: '0 3px', flexShrink: 0 }} />
  )

  return (
    <div style={shell}>
      <style>{EDITOR_CSS}</style>

      <div style={toolbar}>
        <Btn title="Paragraph" active={editor.isActive('paragraph')}
             onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={15} /></Btn>
        <Btn title="Heading 1" active={editor.isActive('heading', { level: 1 })}
             onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></Btn>
        <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })}
             onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></Btn>
        <Btn title="Heading 3" active={editor.isActive('heading', { level: 3 })}
             onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></Btn>

        <Sep />

        <Btn title="Bold" active={editor.isActive('bold')}
             onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></Btn>
        <Btn title="Italic" active={editor.isActive('italic')}
             onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></Btn>
        <Btn title="Underline" active={editor.isActive('underline')}
             onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')}
             onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></Btn>

        <Sep />

        <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })}
             onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></Btn>
        <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })}
             onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></Btn>
        <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })}
             onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></Btn>
        <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })}
             onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={15} /></Btn>

        <Sep />

        <Btn title="Bullet list" active={editor.isActive('bulletList')}
             onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')}
             onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></Btn>
        <Btn title="Quote" active={editor.isActive('blockquote')}
             onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></Btn>
        <Btn title="Divider"
             onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></Btn>

        <Sep />

        <Btn title="Add link" active={editor.isActive('link')} onClick={setLink}><Link2 size={15} /></Btn>
        <Btn title="Remove link" disabled={!editor.isActive('link')}
             onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={15} /></Btn>

        <Sep />

        <Btn title="Undo" disabled={!editor.can().undo()}
             onClick={() => editor.chain().focus().undo().run()}><Undo2 size={15} /></Btn>
        <Btn title="Redo" disabled={!editor.can().redo()}
             onClick={() => editor.chain().focus().redo().run()}><Redo2 size={15} /></Btn>
      </div>

      <EditorContent editor={editor} />

      <div style={footer}>
        {editor.storage.characterCount
          ? null
          : <span>{editor.getText().split(/\s+/).filter(Boolean).length} words</span>}
        <span style={{ marginLeft: 'auto', color: 'var(--gray-400)' }}>
          Formatting is preserved on the website and in the app.
        </span>
      </div>
    </div>
  )
}

const shell = {
  border: '1.5px solid var(--gray-200)',
  borderRadius: '10px',
  overflow: 'hidden',
  background: 'white',
}

const toolbar = {
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px',
  padding: '7px 8px',
  borderBottom: '1px solid var(--gray-200)',
  background: 'var(--gray-50)',
  position: 'sticky', top: 0, zIndex: 2,
}

const footer = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '7px 12px', borderTop: '1px solid var(--gray-200)',
  background: 'var(--gray-50)', fontSize: '11.5px', color: 'var(--gray-500)',
}

/* Styles for the editable area + the rendered article elements. Scoped to the
   editor so they can't leak into the rest of the admin UI. */
const EDITOR_CSS = `
.uf-editor-content {
  min-height: 320px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 16px 18px;
  outline: none;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--gray-800, #1f2937);
}
.uf-editor-content:empty::before {
  content: attr(data-placeholder);
  color: var(--gray-400, #9ca3af);
  pointer-events: none;
}
.uf-editor-content > p:first-child:last-child:empty::before {
  content: attr(data-placeholder);
  color: var(--gray-400, #9ca3af);
  pointer-events: none;
}
.uf-editor-content h1 { font-size: 25px; font-weight: 700; margin: 22px 0 10px; line-height: 1.3; }
.uf-editor-content h2 { font-size: 20px; font-weight: 700; margin: 20px 0 9px;  line-height: 1.35; }
.uf-editor-content h3 { font-size: 17px; font-weight: 600; margin: 18px 0 8px;  line-height: 1.4; }
.uf-editor-content h1:first-child,
.uf-editor-content h2:first-child,
.uf-editor-content h3:first-child { margin-top: 0; }
.uf-editor-content p  { margin: 0 0 11px; }
.uf-editor-content ul,
.uf-editor-content ol { margin: 0 0 11px; padding-left: 24px; }
.uf-editor-content li { margin-bottom: 4px; }
.uf-editor-content li > p { margin: 0; }
.uf-editor-content blockquote {
  border-left: 3px solid var(--purple, #7c3aed);
  padding-left: 14px; margin: 0 0 11px; color: var(--gray-600, #4b5563); font-style: italic;
}
.uf-editor-content a { color: var(--purple, #7c3aed); text-decoration: underline; }
.uf-editor-content hr { border: none; border-top: 1px solid var(--gray-200, #e5e7eb); margin: 18px 0; }
.uf-editor-content code {
  background: var(--gray-100, #f3f4f6); padding: 1px 5px; border-radius: 4px;
  font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.uf-editor-content pre {
  background: var(--gray-100, #f3f4f6); padding: 12px 14px; border-radius: 8px;
  overflow-x: auto; margin: 0 0 11px;
}
.uf-editor-content pre code { background: none; padding: 0; }
`
