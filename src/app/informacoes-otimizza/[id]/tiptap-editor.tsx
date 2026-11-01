"use client";

import React, { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Upload,
  Check,
  X
} from "lucide-react";

interface TiptapEditorProps {
  initialContent: string;
  pageId: string;
  onChange: (html: string, json: Record<string, unknown>) => void;
}

export function TiptapEditor({ initialContent, pageId, onChange }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Link modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs my-3" } },
        blockquote: { HTMLAttributes: { class: "border-l-4 border-indigo-500 pl-4 italic text-slate-700 my-3" } },
        horizontalRule: { HTMLAttributes: { class: "my-6 border-t border-slate-200" } }
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-indigo-600 underline font-medium hover:text-indigo-800" },
        validate: (href) => /^https?:\/\//.test(href) || href.startsWith("/") || href.startsWith("#")
      }),
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: { class: "rounded-lg max-w-full my-4 border border-slate-200 shadow-xs" }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "border-collapse border border-slate-300 w-full my-4" }
      }),
      TableRow.configure({
        HTMLAttributes: { class: "border-b border-slate-200" }
      }),
      TableHeader.configure({
        HTMLAttributes: { class: "border border-slate-300 bg-slate-100 font-bold p-2 text-left text-xs" }
      }),
      TableCell.configure({
        HTMLAttributes: { class: "border border-slate-300 p-2 text-xs" }
      }),
      TaskList.configure({
        HTMLAttributes: { class: "space-y-1 my-3 pl-2" }
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "flex items-start gap-2" }
      })
    ],
    content: initialContent || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[400px] p-6 text-slate-800 " +
          "prose-h1:text-2xl prose-h1:font-bold prose-h1:text-slate-900 prose-h1:mb-3 " +
          "prose-h2:text-xl prose-h2:font-bold prose-h2:text-slate-900 prose-h2:mb-2 " +
          "prose-h3:text-lg prose-h3:font-semibold prose-h3:text-slate-800 prose-h3:mb-2 " +
          "prose-p:leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      onChange(html, json);
    }
  });

  if (!editor) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Carregando editor visual...
      </div>
    );
  }

  const setLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://") && !finalUrl.startsWith("/") && !finalUrl.startsWith("#")) {
        finalUrl = `https://${finalUrl}`;
      }
      editor.chain().focus().setLink({ href: finalUrl }).run();
    }
    setLinkModalOpen(false);
    setLinkUrl("");
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("pageId", pageId);
      if (imageAlt.trim()) formData.append("altText", imageAlt.trim());
      if (imageCaption.trim()) formData.append("caption", imageCaption.trim());

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro no upload da imagem.");
      }

      editor
        .chain()
        .focus()
        .setImage({ src: data.url, alt: imageAlt.trim(), title: imageCaption.trim() })
        .run();

      setImageModalOpen(false);
      setSelectedFile(null);
      setImageAlt("");
      setImageCaption("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Barra de Ferramentas Notion-Style */}
      <div className="bg-slate-50/80 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 text-slate-700 sticky top-16 z-30 backdrop-blur">
        {/* Formatação de Texto */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("bold") ? "bg-slate-200 font-bold text-indigo-700" : ""}`}
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("italic") ? "bg-slate-200 italic text-indigo-700" : ""}`}
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("underline") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Sublinhado (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("strike") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Tachado"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Cabeçalhos */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-slate-200 text-indigo-700 font-bold" : ""}`}
            title="Título 1 (H1)"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-slate-200 text-indigo-700 font-bold" : ""}`}
            title="Título 2 (H2)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-slate-200 text-indigo-700 font-bold" : ""}`}
            title="Título 3 (H3)"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        {/* Listas e Checklists */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("bulletList") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Lista com marcadores"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("orderedList") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Lista numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("taskList") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Checklist / Lista de tarefas"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Blocos Especiais */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("blockquote") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Citação / Destaque"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("codeBlock") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Bloco de código"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded hover:bg-slate-200 transition-colors"
            title="Divisor horizontal"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Tabelas e Mídia */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("table") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Inserir Tabela (3x3 com cabeçalho)"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          {editor.isActive("table") && (
            <div className="flex items-center gap-1 bg-indigo-50/70 p-1 rounded-md text-[11px] text-indigo-700">
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="px-1.5 py-0.5 rounded bg-white hover:bg-indigo-100 border border-indigo-200"
              >
                +Linha
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="px-1.5 py-0.5 rounded bg-white hover:bg-indigo-100 border border-indigo-200"
              >
                +Coluna
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="p-1 rounded hover:bg-rose-100 text-rose-600"
                title="Excluir tabela"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const previousUrl = editor.getAttributes("link").href;
              setLinkUrl(previousUrl || "");
              setLinkModalOpen(true);
            }}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive("link") ? "bg-slate-200 text-indigo-700" : ""}`}
            title="Inserir / Editar Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-700"
            title="Inserir imagem com texto alternativo e legenda"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Desfazer e Refazer */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de Conteúdo ContentEditable */}
      <div className="flex-1 min-h-[450px]">
        <EditorContent editor={editor} />
      </div>

      {/* Modal de Link */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-lg max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Inserir Link</h3>
            <input
              type="text"
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://exemplo.com ou /pagina ou #secao"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={setLink}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de Imagem com Alt e Legenda */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Upload de Imagem
              </h3>
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadImage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arquivo de Imagem (JPEG, PNG, WebP, GIF, SVG - até 5MB) *
                </label>
                <input
                  type="file"
                  required
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto Alternativo (Alt Text - para acessibilidade e IAs)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Ex: Gráfico de posicionamento da Otimizza"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Legenda da Imagem (Opcional)
                </label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Ex: Fonte: Pesquisa interna de mercado 2026"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage || !selectedFile}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? "Enviando..." : "Inserir Imagem"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
