import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { useEffect, useRef } from "react";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Youtube as YtIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadImage, validateImage } from "@/lib/media";
import { isHttpUrl } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false } as never),
      Link.configure({ openOnClick: false, protocols: ["http", "https", "mailto"] }),
      Image,
      Youtube.configure({ nocookie: true }),
    ],
    content: value,
    editorProps: { attributes: { class: "prose-content min-h-[300px] p-4 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false } as never);
  }, [value, editor]);

  if (!editor) return <div className="h-80 animate-pulse rounded-xl bg-muted" />;

  const btn = (active: boolean) => cn("rounded p-2 hover:bg-accent", active && "bg-accent text-primary");
  return (
    <div className="rounded-xl border border-input bg-background">
      <div className="flex flex-wrap gap-1 border-b border-border p-1">
        <button type="button" aria-label="Título" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Subtítulo" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Negrita" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Cursiva" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Lista" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Lista numerada" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Cita" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Enlace"
          className={btn(editor.isActive("link"))}
          onClick={() => {
            const url = window.prompt("URL del enlace (vacío para quitar)", editor.getAttributes("link").href ?? "https://");
            if (url === null) return;
            if (url === "") return editor.chain().focus().unsetLink().run();
            if (!isHttpUrl(url)) return toast.error("URL no válida");
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Imagen" className={btn(false)} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Video de YouTube"
          className={btn(false)}
          onClick={() => {
            const url = window.prompt("URL del video de YouTube");
            if (!url) return;
            if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) return toast.error("Solo se aceptan enlaces de YouTube");
            editor.commands.setYoutubeVideo({ src: url });
          }}
        >
          <YtIcon className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const err = validateImage(f);
            if (err) return toast.error(err);
            try {
              const url = await uploadImage(f, "pages");
              editor.chain().focus().setImage({ src: url, alt: f.name }).run();
            } catch (er) {
              toast.error(er instanceof Error ? er.message : "Error al subir");
            }
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
