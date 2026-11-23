"use client";
import { useCmsCopy } from "@/lib/cms/client";


/**
 * VIJAYA Event Concierge — a small, refined assistant.
 * Answers come from the verified knowledge base + live availability API only.
 * It never invents price, capacity or availability.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, MessageCircle, Send, X } from "lucide-react";
import { track } from "@/lib/analytics";

interface Msg {
  role: "assistant" | "user";
  content: string;
  suggestions?: string[];
  action?: { label: string; href: string } | null;
}

const OPENING: Msg = {
  role: "assistant",
  content: "Planning an event? I can help you find the right VIJAYA space.",
  suggestions: ["Wedding for 500 guests", "Is my date available?", "Business conference options", "NRI planning"],
};

export function ConciergeWidget() {
  const cmsCopy = useCmsCopy("copy.components.concierge.concierge-widget");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([OPENING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  // Hidden inside checkout & portal for focus.
  useEffect(() => {
    const hide = window.location.pathname.startsWith("/book/") || window.location.pathname.startsWith("/my-vijaya");
    if (!hide) return;
    const task = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(task);
  }, [pathname]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    setMessages((m) => [...m, { role: "user", content: t }]);
    setInput("");
    setTyping(true);
    track("concierge_message", { length: t.length });
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply, suggestions: data.suggestions, action: data.action }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I'm having trouble right now — please try again in a moment, or reach the team from the contact page.", suggestions: [] },
      ]);
    } finally {
      setTyping(false);
    }
  };

  // The launcher sits above the sticky space CTA where present.
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-[calc(100vw-2.5rem)] max-w-sm bg-ivory border border-border shadow-[0_24px_70px_-20px_rgba(17,17,17,0.45)] rounded-sm overflow-hidden"
            role="dialog"
            aria-label={cmsCopy("aria-label.vijaya-event-concierge", "VIJAYA Event Concierge")}
          >
            <div className="bg-burgundy text-ivory px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium tracking-wide">{cmsCopy("text.vijaya-event-concierge", "VIJAYA Event Concierge")}</p>
                <p className="text-[11px] text-ivory/60 mt-0.5">{cmsCopy("text.verified-information-live-availability", "Verified information · live availability")}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={cmsCopy("aria-label.close-concierge", "Close concierge")} className="p-1.5 hover:bg-ivory/10 rounded-sm transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="h-80 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] ${m.role === "user" ? "bg-burgundy text-ivory" : "bg-muted text-ink"} rounded-sm px-4 py-3`}>
                    <p className="text-[13px] font-light leading-6">{m.content}</p>
                    {m.action && (
                      <Link href={m.action.href} onClick={() => setOpen(false)} className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-burgundy link-underline">
                        {m.action.label} <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {m.suggestions && m.suggestions.length > 0 && i === messages.length - 1 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.suggestions.map((s) => (
                          <button key={s} onClick={() => send(s)} className="chip !py-1 !text-[10px] hover:!border-burgundy/40 hover:text-ink transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-sm px-4 py-3 flex gap-1.5" aria-label={cmsCopy("aria-label.concierge-is-typing", "Concierge is typing")}>
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full bg-stone/60 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="hairline-t p-3 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={cmsCopy("placeholder.ask-about-spaces-dates-or-planning", "Ask about spaces, dates or planning…")}
                aria-label={cmsCopy("aria-label.message-the-concierge", "Message the concierge")}
                className="flex-1 bg-transparent text-[13px] px-3 py-2.5 placeholder:text-stone/50 focus:outline-none"
              />
              <button type="submit" disabled={typing || !input.trim()} aria-label={cmsCopy("aria-label.send-message", "Send message")} className="h-10 w-10 inline-flex items-center justify-center bg-burgundy text-ivory rounded-sm transition-opacity disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) track("concierge_opened", {});
        }}
        aria-expanded={open}
        aria-label={open ? "Close concierge" : "Open VIJAYA Event Concierge"}
        className="h-13 w-13 h-[52px] w-[52px] inline-flex items-center justify-center rounded-full bg-burgundy text-ivory shadow-[0_16px_40px_-10px_rgba(66,29,36,0.6)] transition-all duration-300 hover:bg-burgundy-deep hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
