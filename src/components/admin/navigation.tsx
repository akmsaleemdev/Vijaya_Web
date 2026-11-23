"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Command } from "cmdk";

export function AdminNavigation({ links }: { links: { path: string; label: string }[] }) {
  const current = usePathname();
  const [search, setSearch] = useState(false);
  return <div className="v-stack">
    <button type="button" className="v-button" aria-expanded={search} onClick={() => setSearch(!search)}>Find a section</button>
    {search && <Command className="rounded bg-white p-2 text-burgundy"><Command.Input aria-label="Find a section" placeholder="Search sections…" /><Command.List>
      <Command.Empty>No sections found.</Command.Empty>
      {links.map((item) => <Command.Item className="p-1 aria-selected:bg-ivory" value={item.label} key={item.path}>
        <Link href={item.path} onClick={() => setSearch(false)}>{item.label}</Link>
      </Command.Item>)}
    </Command.List></Command>}
    <nav className="v-nav" aria-label="Admin navigation">{links.map((item) => <Link key={item.path} aria-current={current === item.path ? "page" : undefined} href={item.path}>{item.label}</Link>)}</nav>
  </div>;
}
