import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBlocker } from "@tanstack/react-router";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Upload, X } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartImage } from "@/components/site/SmartImage";
import { cropImage, uploadImage, validateImage } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"rounded-2xl border border-border bg-card p-5 shadow-soft " + className}>{children}</div>;
}

export function ConfirmDelete({ onConfirm, label = "Eliminar", description = "Esta acción no se puede deshacer." }: { onConfirm: () => void; label?: string; description?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Seguro que quieres eliminar?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Warn on navigation / tab close when there are unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useBlocker({
    shouldBlockFn: () => dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir de todos modos?"),
    enableBeforeUnload: () => dirty,
  });
}

/** Persists a new order of rows to the given table. */
export async function saveOrder(table: "apps" | "categories" | "experience" | "skills" | "gallery" | "pages", ids: string[], column = "sort_order") {
  const results = await Promise.all(
    ids.map((id, i) => supabase.from(table).update({ [column]: i + 1 } as never).eq("id", id)),
  );
  if (results.some((r) => r.error)) toast.error("No se pudo guardar el orden");
  else toast.success("Orden guardado");
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  render,
  grid,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  render: (item: T, handle: ReactNode) => ReactNode;
  grid?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    onReorder(arrayMove(items, from, to));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={grid ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" : "space-y-2"}>
          {items.map((it) => (
            <SortableItem key={it.id} id={it.id}>
              {(handle) => render(it, handle)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" {...attributes} {...listeners} aria-label="Arrastrar para reordenar" className="cursor-grab touch-none p-1 text-muted-foreground active:cursor-grabbing">
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : undefined }}>
      {children(handle)}
    </div>
  );
}

/** Image field with upload, optional 16:9 crop, progress, preview and remove. */
export function ImageField({
  value,
  onChange,
  folder,
  aspect,
  label,
  previewClass = "aspect-video w-full max-w-sm rounded-xl",
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: string;
  aspect?: number;
  label: string;
  previewClass?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [pendingType, setPendingType] = useState("");

  useEffect(() => () => void (cropSrc && URL.revokeObjectURL(cropSrc)), [cropSrc]);

  async function doUpload(file: Blob) {
    try {
      setProgress(5);
      const url = await uploadImage(file, folder, setProgress);
      onChange(url);
      toast.success("Imagen subida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setProgress(null);
    }
  }

  function onFile(f: File | undefined) {
    if (!f) return;
    const err = validateImage(f);
    if (err) return toast.error(err);
    if (aspect && f.type !== "image/svg+xml" && f.type !== "image/gif") {
      setPendingType(f.type);
      setCropSrc(URL.createObjectURL(f));
    } else doUpload(f);
  }

  async function confirmCrop() {
    if (!cropSrc || !area) return;
    const blob = await cropImage(cropSrc, area);
    setCropSrc(null);
    void pendingType;
    doUpload(blob);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <SmartImage src={value} alt={label} className={previewClass + " border border-border"} />
      {progress !== null && <Progress value={progress} className="max-w-sm" />}
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" className="hidden" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
          <Upload className="mr-1 h-4 w-4" /> {value ? "Cambiar" : "Subir imagen"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="mr-1 h-4 w-4" /> Quitar
          </Button>
        )}
      </div>
      <Dialog open={!!cropSrc} onOpenChange={(o) => !o && setCropSrc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar imagen</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            {cropSrc && <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />}
          </div>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropSrc(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmCrop}>Usar imagen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
