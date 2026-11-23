"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, useState } from "react";

type Item = { src: string; alt: string; category: string; caption?: string; published?: boolean };
type Entry = Item & { id: string };

function ImageEditor({ entry, change, remove }: { entry: Entry; change: (entry: Entry) => void; remove: () => void }) {
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({ id: entry.id });
  const update = (field: keyof Item, value: string | boolean) => change({ ...entry, [field]: value });
  return <div className="v-panel v-stack" ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition: transition }}>
    <div className="v-row justify-between"><button type="button" className="v-button touch-none" {...attributes} {...listeners}>Reorder image</button>
      <button type="button" className="v-button" onClick={remove}>Remove from gallery</button></div>
    <div className="v-grid">
      <label>Image path<input value={entry.src} onChange={(event) => update("src", event.target.value)} required /></label>
      <label>Alt text<input value={entry.alt} onChange={(event) => update("alt", event.target.value)} required /></label>
      <label>Category<input value={entry.category} onChange={(event) => update("category", event.target.value)} required /></label>
      <label>Caption<input value={entry.caption ?? ""} onChange={(event) => update("caption", event.target.value)} /></label>
    </div>
    <label className="!flex"><input type="checkbox" checked={entry.published !== false} onChange={(event) => update("published", event.target.checked)} /> Visible in gallery</label>
  </div>;
}

export function GalleryEditor({ initial }: { initial: Item[] }) {
  const context = useId();
  const [items, setItems] = useState(initial.map((item, index) => ({ ...item, id: String(index) })));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function move({ active, over }: DragEndEvent) {
    if (!over || over.id === active.id) return;
    setItems((rows) => arrayMove(rows, rows.findIndex((row) => row.id === active.id), rows.findIndex((row) => row.id === over.id)));
  }
  return <div className="v-stack">
    <input type="hidden" name="payload" value={JSON.stringify(items.map(({ src, alt, category, caption, published }) => ({ src, alt, category, caption: caption || undefined, published })))} />
    <DndContext id={context} sensors={sensors} onDragEnd={move} collisionDetection={closestCenter}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {items.map((entry) => <ImageEditor key={entry.id} entry={entry} change={(item) => setItems((rows) => rows.map((row) => row.id === item.id ? item : row))} remove={() => setItems((rows) => rows.filter((row) => row.id !== entry.id))} />)}
      </SortableContext>
    </DndContext>
    <div><button type="button" className="v-button" onClick={() => setItems((rows) => [...rows, { id: crypto.randomUUID(), src: "", alt: "", category: "Property", published: true }])}>Add gallery image</button></div>
  </div>;
}
