import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import {Table} from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { useEffect, useState } from 'react';
import SearchableSelect from './SearchableSelect';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
console.log(placeholder);
  const [fontFamilyValue, setFontFamilyValue] = useState<string>('');
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const setColor = (color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
  };

  const setHighlight = (color: string) => {
    if (!editor) return;
    editor.chain().focus().toggleHighlight({ color }).run();
  };

  const setTextAlign = (alignment: string) => {
    if (!editor) return;
    editor.chain().focus().setTextAlign(alignment).run();
  };

  const setFontFamily = (family: string) => {
    if (!editor) return;
    editor.chain().focus().setFontFamily(family).run();
  };

  useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content || "");
  }
}, [content]);

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="toolbar flex flex-wrap gap-1 p-2 bg-gray-100 border-b">
        {/* Estilos de texto */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={editor?.isActive('bold') ? 'bg-blue-500 text-white p-1 rounded' : 'p-1 hover:bg-gray-200 rounded'}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={editor?.isActive('italic') ? 'bg-blue-500 text-white p-1 rounded' : 'p-1 hover:bg-gray-200 rounded'}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={editor?.isActive('underline') ? 'bg-blue-500 text-white p-1 rounded' : 'p-1 hover:bg-gray-200 rounded'}
        >
          <u>U</u>
        </button>

        {/* Alineación */}
        <button
          type="button"
          onClick={() => setTextAlign('left')}
          className={editor?.isActive({ textAlign: 'left' }) ? 'bg-blue-500 text-white p-1 rounded' : 'p-1 hover:bg-gray-200 rounded'}
        >
          ❲
        </button>
        <button
          type="button"
          onClick={() => setTextAlign('center')}
          className={editor?.isActive({ textAlign: 'center' }) ? 'bg-blue-500 text-white p-1 rounded' : 'p-1 hover:bg-gray-200 rounded'}
        >
          ❳
        </button>
        <button
          type="button"
          onClick={() => setTextAlign('right')}
          className={editor?.isActive({ textAlign: 'right' }) ? 'bg-blue-500 text-white p-1 rounded' : 'p-1 hover:bg-gray-200 rounded'}
        >
          ❳
        </button>

        {/* Colores de texto */}
        <div className="flex gap-1 items-center">
          <span className="text-xs">Color:</span>
          <button
            type="button"
            onClick={() => setColor('#000000')}
            className="w-5 h-5 rounded-full border border-gray-300 bg-black"
          />
          <button
            type="button"
            onClick={() => setColor('#FF0000')}
            className="w-5 h-5 rounded-full border border-gray-300 bg-red-500"
          />
          <button
            type="button"
            onClick={() => setColor('#00FF00')}
            className="w-5 h-5 rounded-full border border-gray-300 bg-green-500"
          />
          <button
            type="button"
            onClick={() => setColor('#0000FF')}
            className="w-5 h-5 rounded-full border border-gray-300 bg-blue-500"
          />
        </div>

        {/* Resaltado */}
        <div className="flex gap-1 items-center">
          <span className="text-xs">Resaltar:</span>
          <button
            type="button"
            onClick={() => setHighlight('#FFFF00')}
            className="w-5 h-5 rounded-full border border-gray-300 bg-yellow-300"
          />
          <button
            type="button"
            onClick={() => setHighlight('#00FFFF')}
            className="w-5 h-5 rounded-full border border-gray-300 bg-cyan-400"
          />
        </div>

        {/* Fuentes */}
        <div className="min-w-[180px]">
          <SearchableSelect
            options={[
              { value: '', label: 'Fuente' },
              { value: 'Arial, sans-serif', label: 'Arial' },
              { value: "'Times New Roman', serif", label: 'Times New Roman' },
              { value: "'Courier New', monospace", label: 'Courier New' },
            ]}
            value={fontFamilyValue}
            onChange={(value) => {
              const nextValue = String(value ?? '');
              setFontFamilyValue(nextValue);
              setFontFamily(nextValue);
            }}
            placeholder="Fuente"
            isClearable
          />
        </div>

        {/* Tablas */}
        <button
          type="button"
          onClick={insertTable}
          className="p-1 hover:bg-gray-200 rounded"
        >
          Tabla
        </button>
      </div>
      <EditorContent editor={editor} className="editor p-2 min-h-[200px]" />
    </div>
  );
}
