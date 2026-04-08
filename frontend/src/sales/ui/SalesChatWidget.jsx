'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { trackEvent } from '@/src/lib/analytics';

const STORAGE_KEY = 'amaia-sales-conversation-id';
const SALES_INITIAL_MESSAGE = "I’m AMAIA Sales AI. I’ll help you determine if this platform gives you a real edge.";

function createConversationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `conv_${crypto.randomUUID()}`;
  return `conv_${Date.now()}`;
}

function getConversationId() {
  if (typeof window === 'undefined') return 'conv_server';
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = createConversationId();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

function IntentPill({ intent, score }) {
  const tone =
    intent === 'hot'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
      : intent === 'warm'
        ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
        : 'border-white/10 bg-white/[0.05] text-slate-200';

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${tone}`}>
      {intent ?? 'cold'} · {score ?? 0}
    </span>
  );
}

export default function SalesChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState('conv_booting');
  const [messages, setMessages] = useState([{ role: 'assistant', content: SALES_INITIAL_MESSAGE, timestamp: new Date().toISOString() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadState, setLeadState] = useState(null);
  const [error, setError] = useState('');
  const [submittingCta, setSubmittingCta] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => setConversationId(getConversationId()), []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const source = useMemo(() => {
    if (typeof window === 'undefined') return 'website';
    return window.location.pathname === '/' ? 'landing_widget' : `widget_${window.location.pathname.replace(/\//g, '_')}`;
  }, []);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sales/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, source, message: userMessage.content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Sales chat failed.');
      setMessages((current) => [...current, data.reply]);
      setLeadState(data.meta);
      trackEvent('sales_chat_message', {
        leadScore: data.meta?.leadScore ?? 0,
        intentLevel: data.meta?.intentLevel ?? 'cold',
        action: data.meta?.recommendedNextAction ?? 'none',
      });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrimaryCta() {
    if (!leadState?.primaryCta || submittingCta) return;
    setSubmittingCta(true);
    try {
      await fetch('/api/sales/cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          ctaType: leadState.recommendedNextAction,
          label: leadState.primaryCta.label,
          source,
        }),
      });
      trackEvent('sales_chat_cta_clicked', { cta: leadState.recommendedNextAction, intentLevel: leadState.intentLevel });
      window.location.href = leadState.primaryCta.href;
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setSubmittingCta(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[min(94vw,420px)] rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,12,26,0.96),rgba(3,7,18,0.98))] shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">AMAIA Sales AI</p>
              <p className="mt-1 text-sm text-slate-300">AI assistant · qualification + CTA engine</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/[0.06]">
              Close
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.timestamp}`}
                className={`rounded-[22px] border px-4 py-3 text-sm leading-7 ${
                  message.role === 'assistant'
                    ? 'border-cyan-500/15 bg-cyan-500/[0.05] text-slate-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-200'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{message.role === 'assistant' ? 'AMAIA Sales AI' : 'You'}</p>
                <p className="mt-2">{message.content}</p>
              </div>
            ))}
            {loading ? <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">AMAIA Sales AI is evaluating fit...</div> : null}
          </div>

          <div className="border-t border-white/10 px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <IntentPill intent={leadState?.intentLevel} score={leadState?.leadScore} />
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-300">{leadState?.segment ?? 'retail'}</span>
              {leadState?.escalation?.required ? <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-amber-100">human escalation</span> : null}
            </div>
            {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
                placeholder="Tell AMAIA how you trade, what you use, and where your process breaks."
                className="min-h-[84px] flex-1 resize-none rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/30"
              />
              <button type="button" onClick={sendMessage} disabled={loading || !input.trim()} className="rounded-[20px] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-50">
                Send
              </button>
            </div>
            {leadState?.primaryCta ? (
              <button type="button" onClick={handlePrimaryCta} disabled={submittingCta} className="mt-4 w-full rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:opacity-60">
                {submittingCta ? 'Routing...' : leadState.primaryCta.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          trackEvent('sales_chat_toggled', { open: !open });
        }}
        className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.2),rgba(34,211,238,0.08))] px-5 py-3 text-sm font-semibold text-cyan-100 shadow-[0_18px_50px_rgba(14,165,233,0.2)] transition hover:translate-y-[-1px]"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-lg">AI</span>
        <span className="text-left">
          <span className="block text-[10px] uppercase tracking-[0.24em] text-cyan-200/80">Sales Operator</span>
          <span className="block text-sm text-white">Ask AMAIA if this is your edge</span>
        </span>
      </button>
    </div>
  );
}
