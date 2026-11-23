"use client";

import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, markdownShortcutPlugin } from "@mdxeditor/editor";
import { useState } from "react";
import "@mdxeditor/editor/style.css";

export default function NewsEditor({ initial }: { initial: { title: string; body: string }[] }) {
  const [items, setItems] = useState(initial.map((item, index) => ({ ...item, id: String(index) })));
  const update = (id: string, fields: Partial<{ title: string; body: string }>) => setItems((rows) => rows.map((row) => row.id === id ? { ...row, ...fields } : row));
  return <div className="v-stack">
    <input type="hidden" name="payload" value={JSON.stringify(items.map(({ title, body }) => ({ title, body })))} />
    {items.map((item) => <section className="v-panel v-stack" key={item.id}>
      <label>Title<input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} required /></label>
      <div className="border rounded"><MDXEditor markdown={item.body} onChange={(body) => update(item.id, { body })} plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), markdownShortcutPlugin()]} /></div>
      <div><button type="button" className="v-button" onClick={() => setItems((rows) => rows.filter((row) => row.id !== item.id))}>Remove article</button></div>
    </section>)}
    <div><button type="button" className="v-button" onClick={() => setItems((rows) => [...rows, { id: crypto.randomUUID(), title: "", body: "" }])}>Add article</button></div>
  </div>;
}
