"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";

import { Button, Spinner } from "@/components/ui";
import { useQuery } from "@/hooks/useApi";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  failed?: boolean;
}

const STARTERS = [
  "What did the team work on last week?",
  "Who has open blockers right now?",
  "Is anyone's workload heavier than the others?",
  "How much time went to meetings versus development?",
];

export function ChatWidget() {
  const { isManager } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only fetch status once the panel is opened, so the endpoint isn't hit
  // on every page load for people who never use the assistant.
  const { data: status } = useQuery<{ available: boolean; model: string | null }>(
    open && isManager ? "/assistant/status" : null,
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isManager) return null;

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    setInput("");
    setSending(true);

    // Keep the history we send small - the backend caps it too, but there's
    // no point shipping twenty turns across the wire.
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const res = await api.post<{ answer: string; tools_used: string[] }>(
        "/assistant/chat",
        { question: trimmed, history },
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, tools: res.tools_used },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong reaching the assistant.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: message, failed: true },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-13 items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-hover hover:shadow-xl"
          aria-label="Open the team assistant"
        >
          <Sparkles size={17} />
          Ask about the team
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[min(37rem,calc(100vh-3rem))] w-[min(26rem,calc(100vw-3rem))] flex-col rounded-xl border border-line bg-surface shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Bot size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Team assistant</p>
                <p className="text-xs text-muted">
                  Answers from your team&apos;s reports
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {status && !status.available && (
              <div className="rounded-md border border-warning/20 bg-warning-soft px-3 py-2.5 text-sm text-warning">
                The assistant is not configured on this server. Add a{" "}
                <code className="text-xs">GEMINI_API_KEY</code> to enable it.
              </div>
            )}

            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Ask me about what your team has been working on. I read the
                  submitted reports — I can&apos;t change anything.
                </p>
                <div className="space-y-1.5">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      onClick={() => send(starter)}
                      disabled={status?.available === false}
                      className="w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:border-primary-border hover:bg-primary-soft hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, i) => (
              <div
                key={i}
                className={message.role === "user" ? "flex justify-end" : ""}
              >
                {message.role === "user" ? (
                  <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-white">
                    {message.content}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div
                      className={`rounded-lg rounded-bl-sm px-3.5 py-2.5 text-sm ${
                        message.failed
                          ? "bg-danger-soft text-danger"
                          : "bg-surface-muted text-ink-soft"
                      }`}
                    >
                      {/* The model writes markdown-ish bullets and bold; render
                          the line breaks at least, without pulling in a parser. */}
                      <div className="space-y-2 whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                    {message.tools && message.tools.length > 0 && (
                      <p className="px-1 text-[11px] text-faint">
                        Looked up: {[...new Set(message.tools)].join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 px-1 text-sm text-muted">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
                Checking the reports
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your team..."
              disabled={sending || status?.available === false}
              className="flex-1 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-surface-muted"
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending || status?.available === false}
              className="px-3"
              aria-label="Send"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}