import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import LinkExt from "@tiptap/extension-link";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, Heading2, Heading3,
  List, Quote, Link2, Image as ImageIcon, Video, Type, Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// FontSize viene de @tiptap/extension-text-style en TipTap v3

const FONT_FAMILIES = [
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Press Start 2P", value: "'Press Start 2P', cursive" },
  { label: "Orbitron", value: "Orbitron, sans-serif" },
  { label: "Rajdhani", value: "Rajdhani, sans-serif" },
  { label: "Space Mono", value: "'Space Mono', monospace" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
];

const COLORS = [
  { label: "Verde", value: "#39ff14" },
  { label: "Cyan", value: "#00ffff" },
  { label: "Magenta", value: "#ff00ff" },
  { label: "Amarillo", value: "#ffff00" },
  { label: "Naranja", value: "#ff8c00" },
  { label: "Blanco", value: "#ffffff" },
];

const SIZES = [
  { label: "Pequeño", value: "12px" },
  { label: "Normal", value: "14px" },
  { label: "Grande", value: "18px" },
  { label: "Extra", value: "24px" },
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  showToolbar?: boolean;
  allowImages?: boolean;
  allowVideo?: boolean;
  allowLinks?: boolean;
  singleLine?: boolean;
  maxChars?: number;
}

export default function RichTextEditor({
  value, onChange, placeholder, minHeight = 140,
  showToolbar = true, allowImages = true, allowVideo = true, allowLinks = true, singleLine = false,
}: Props) {
  const [showFonts, setShowFonts] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank", class: "text-primary underline" } }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      let html = editor.getHTML();
      if (singleLine) html = html.replace(/<\/p><p[^>]*>/g, " ").replace(/<\/?p[^>]*>/g, "");
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert prose-sm max-w-none focus:outline-none w-full",
          "[&_p]:my-1 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-2 [&_h3]:text-base [&_h3]:font-bold",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-neon-cyan [&_blockquote]:pl-3 [&_blockquote]:italic",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        ),
        style: `min-height:${minHeight}px;`,
      },
    },
  });

  if (!editor) return null;

  const promptLink = () => {
    const url = window.prompt("URL del enlace:", "https://");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImg = () => {
    const url = window.prompt("URL de la imagen:");
    if (!url) return;
    editor.chain().focus().insertContent(`<p>${url}</p>`).run();
  };

  const insertVideo = () => {
    const url = window.prompt("URL del video (YouTube/Vimeo):");
    if (!url) return;
    editor.chain().focus().insertContent(`<p>${url}</p>`).run();
  };

  const Btn = ({ active, onClick, title, children }: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
        active && "bg-neon-cyan/20 text-neon-cyan",
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded bg-muted/40 overflow-visible">
      {showToolbar && (
        <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-2 py-1 bg-card/40">
          {allowImages && <Btn onClick={insertImg} title="Insertar imagen por URL"><ImageIcon className="w-4 h-4" /></Btn>}
          {allowVideo && <Btn onClick={insertVideo} title="Insertar video por URL"><Video className="w-4 h-4" /></Btn>}
          {allowLinks && <Btn onClick={promptLink} title="Enlace"><Link2 className="w-4 h-4" /></Btn>}
          {(allowImages || allowVideo || allowLinks) && <div className="w-px h-5 bg-border mx-1" />}
          <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Encabezado H2"><Heading2 className="w-4 h-4" /></Btn>
          <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Encabezado H3"><Heading3 className="w-4 h-4" /></Btn>
          <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista"><List className="w-4 h-4" /></Btn>
          <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Cita"><Quote className="w-4 h-4" /></Btn>
          <span className="ml-auto text-[9px] text-muted-foreground italic font-body hidden sm:inline">Selecciona texto para más opciones →</span>
        </div>
      )}

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100, placement: "top" }}
        className="flex items-center gap-0.5 bg-card border border-neon-cyan/40 rounded-md shadow-[0_0_20px_rgba(0,255,255,0.25)] p-1 flex-wrap max-w-[95vw]"
      >
        <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita"><Bold className="w-3.5 h-3.5" /></Btn>
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva"><Italic className="w-3.5 h-3.5" /></Btn>
        <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Subrayado"><UnderlineIcon className="w-3.5 h-3.5" /></Btn>
        <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></Btn>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Izquierda"><AlignLeft className="w-3.5 h-3.5" /></Btn>
        <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centro"><AlignCenter className="w-3.5 h-3.5" /></Btn>
        <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Derecha"><AlignRight className="w-3.5 h-3.5" /></Btn>
        <div className="w-px h-4 bg-border mx-0.5" />
        <div className="relative">
          <Btn onClick={() => { setShowColors(v => !v); setShowFonts(false); setShowSizes(false); }} title="Color"><Palette className="w-3.5 h-3.5" /></Btn>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded p-1.5 flex gap-1 z-50 shadow-lg">
              {COLORS.map(c => (
                <button key={c.value} type="button" title={c.label}
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c.value).run(); setShowColors(false); }}
                  className="w-5 h-5 rounded border border-white/20 hover:scale-110 transition-transform"
                  style={{ background: c.value }} />
              ))}
              <button type="button" title="Quitar color"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColors(false); }}
                className="w-5 h-5 rounded border border-white/20 bg-transparent text-[8px] text-foreground">×</button>
            </div>
          )}
        </div>
        <div className="relative">
          <Btn onClick={() => { setShowSizes(v => !v); setShowFonts(false); setShowColors(false); }} title="Tamaño"><Type className="w-3.5 h-3.5" /></Btn>
          {showSizes && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded p-1 z-50 shadow-lg min-w-[100px]">
              {SIZES.map(s => (
                <button key={s.value} type="button"
                  onMouseDown={(e) => { e.preventDefault(); (editor.chain().focus() as any).setFontSize(s.value).run(); setShowSizes(false); }}
                  className="block w-full text-left px-2 py-1 text-xs hover:bg-muted rounded"
                  style={{ fontSize: s.value }}>{s.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <Btn onClick={() => { setShowFonts(v => !v); setShowColors(false); setShowSizes(false); }} title="Tipografía">
            <span className="text-[10px] font-bold px-1">Aa</span>
          </Btn>
          {showFonts && (
            <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded p-1 z-50 shadow-lg max-h-60 overflow-y-auto min-w-[140px]">
              {FONT_FAMILIES.map(f => (
                <button key={f.value} type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setFontFamily(f.value).run(); setShowFonts(false); }}
                  className="block w-full text-left px-2 py-1 text-xs hover:bg-muted rounded"
                  style={{ fontFamily: f.value }}>{f.label}</button>
              ))}
            </div>
          )}
        </div>
        {allowLinks && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Btn active={editor.isActive("link")} onClick={promptLink} title="Enlace"><Link2 className="w-3.5 h-3.5" /></Btn>
          </>
        )}
      </BubbleMenu>

      <div className="px-3 py-2">
        {!value && placeholder && (
          <div className="absolute pointer-events-none text-muted-foreground text-sm">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Render seguro de HTML rich-text producido por el editor.
import { sanitizeHtml } from "@/lib/htmlContent";
export function RichTextRender({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-invert prose-sm max-w-none break-words",
        "[&_p]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h3]:text-base [&_h3]:font-bold",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-neon-cyan [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_a]:text-primary [&_a]:underline",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
