'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, SendHorizontal } from 'lucide-react';

type Message = { id: string; sender: string; body: string; createdAt: string };
type Thread = { id: string; subject: string; category: string; status: string; messages: Message[] };
type SavedConversation = { threadId: string; token: string };

const STORAGE_KEY = 'ensaar-support-conversation';

function savedConversation(): SavedConversation | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as SavedConversation | null;
    return parsed?.threadId && parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export function EnsaarLiveSupport() {
  const [conversation, setConversation] = useState<SavedConversation | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  const sync = useCallback(async (current: SavedConversation, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', ...current }),
      });
      if (response.status === 404) {
        localStorage.removeItem(STORAGE_KEY);
        setConversation(null);
        setThread(null);
        return;
      }
      const data = await response.json() as { thread?: Thread; error?: string };
      if (!response.ok || !data.thread) throw new Error(data.error || 'Unable to load the conversation.');
      setThread(data.thread);
    } catch (reason) {
      if (!quiet) setError(reason instanceof Error ? reason.message : 'Unable to load support.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = savedConversation();
    setConversation(saved);
    if (saved) void sync(saved);
    else setLoading(false);
  }, [sync]);

  useEffect(() => {
    if (!conversation) return;
    const timer = window.setInterval(() => void sync(conversation, true), 5000);
    return () => window.clearInterval(timer);
  }, [conversation, sync]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [thread?.messages.length]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create', name: values.get('name'), email: values.get('email'),
          category: values.get('category'), subject: values.get('subject'), body: values.get('body'),
        }),
      });
      const data = await response.json() as { thread?: Thread; token?: string; error?: string };
      if (!response.ok || !data.thread || !data.token) throw new Error(data.error || 'Unable to start live support.');
      const next = { threadId: data.thread.id, token: data.token };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setConversation(next);
      await sync(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start live support.');
    } finally {
      setSending(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation) return;
    const form = event.currentTarget;
    const field = form.elements.namedItem('message') as HTMLTextAreaElement;
    const body = field.value.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', ...conversation, body }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to send your message.');
      field.value = '';
      await sync(conversation, true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-300">Loading live support...</p>;
  if (!conversation || !thread) {
    return (
      <form onSubmit={start} className="grid gap-4" noValidate>
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-[#59d8c8]/10 p-2 text-[#59d8c8]"><Headphones className="h-5 w-5" /></span>
          <div><h2 className="text-xl font-semibold">Chat with our team</h2><p className="mt-1 text-sm leading-relaxed text-slate-300">Start a persistent conversation. Replies will remain here when you return.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-300">Name<input name="name" required minLength={2} maxLength={120} autoComplete="name" className="rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-[#59d8c8]" /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-300">Email<input name="email" required type="email" maxLength={254} autoComplete="email" className="rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-[#59d8c8]" /></label>
        </div>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">Category<select name="category" defaultValue="enterprise" className="rounded-md border border-white/15 bg-[#0c2343] px-3 py-2.5 text-sm text-white outline-none focus:border-[#59d8c8]"><option value="enterprise">Enterprise services</option><option value="learning">DailyByte and learning</option><option value="technical">Technical question</option><option value="billing">Pricing and billing</option><option value="feedback">Feedback</option><option value="other">Something else</option></select></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">Subject<input name="subject" required minLength={3} maxLength={120} placeholder="What do you need help with?" className="rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-[#59d8c8]" /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">Message<textarea name="body" required maxLength={4000} rows={4} placeholder="Share the context our team needs to help." className="resize-y rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-[#59d8c8]" /></label>
        {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
        <button type="submit" disabled={sending} className="flex items-center justify-center gap-2 rounded-md bg-[#59d8c8] px-4 py-3 text-sm font-semibold text-[#081a31] disabled:opacity-50"><SendHorizontal className="h-4 w-4" />{sending ? 'Starting...' : 'Start live chat'}</button>
      </form>
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="border-b border-white/10 pb-3"><h2 className="text-lg font-semibold">{thread.subject}</h2><p className="mt-1 text-xs capitalize text-slate-400">{thread.category} · {thread.status}</p></div>
      <div className="my-3 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {thread.messages.map((message) => <div key={message.id} className={`w-fit max-w-[86%] rounded-lg px-3 py-2.5 text-sm ${message.sender === 'admin' ? 'bg-white/10 text-slate-100' : 'ml-auto bg-[#59d8c8] text-[#081a31]'}`}><p className="whitespace-pre-wrap leading-relaxed">{message.body}</p><time className={`mt-1 block text-[0.625rem] ${message.sender === 'admin' ? 'text-slate-400' : 'text-[#0c2343]/65'}`}>{new Date(message.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time></div>)}
        <div ref={end} />
      </div>
      {error && <p className="mb-2 text-xs text-red-300" role="alert">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-white/10 pt-3"><textarea name="message" required maxLength={4000} rows={2} placeholder="Type your message" className="min-h-[44px] flex-1 resize-y rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-[#59d8c8]" /><button type="submit" disabled={sending} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#59d8c8] text-[#081a31] disabled:opacity-50"><SendHorizontal className="h-4 w-4" /></button></form>
    </div>
  );
}
