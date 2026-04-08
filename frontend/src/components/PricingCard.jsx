'use client';

import { useEffect, useMemo, useState } from 'react';

import { trackEvent } from '@/src/lib/analytics';
import { pricingCampaign, pricingVariants } from '@/src/config/pricing';
import CountdownTimer from '@/src/components/CountdownTimer';
import { readSignupState, readVariantState, writeSignupState, writeVariantState } from '@/src/lib/time';
import { getOrCreateConversationId } from '@/src/lib/conversation';

const valueBullets = [
  'Cross-exchange accumulation intelligence',
  'Real-time scanner + structure detection',
  'Spot and futures coverage',
  'Built for precision, not noise',
];

export default function PricingCard({ stripeUrl, paypalUrl, demoUrl }) {
  const [timerState, setTimerState] = useState({ expired: false, under24h: false });
  const [signedUp, setSignedUp] = useState(() => readSignupState(pricingCampaign.id));
  const [conversationId, setConversationId] = useState('conv_booting');
  const [variantKey, setVariantKey] = useState('A');

  useEffect(() => {
    const id = getOrCreateConversationId();
    setConversationId(id);

    const storedVariant = readVariantState(pricingCampaign.id);
    if (storedVariant && pricingVariants[storedVariant]) {
      setVariantKey(storedVariant);
    } else {
      const nextVariant = id.charCodeAt(id.length - 1) % 2 === 0 ? 'A' : 'B';
      writeVariantState(pricingCampaign.id, nextVariant);
      setVariantKey(nextVariant);
      trackEvent('pricing_variant_assigned', { variant: nextVariant });
    }
  }, []);

  useEffect(() => {
    if (!conversationId || conversationId === 'conv_booting') return;

    let active = true;

    async function loadStatus() {
      try {
        const response = await fetch(`/api/sales/access-status?conversationId=${encodeURIComponent(conversationId)}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) return;
        if (active) {
          setSignedUp(Boolean(data.signedUp));
          writeSignupState(pricingCampaign.id, Boolean(data.signedUp));
        }
      } catch {
        // keep graceful fallback to local state
      }
    }

    loadStatus();
    return () => {
      active = false;
    };
  }, [conversationId]);

  const variant = pricingVariants[variantKey] ?? pricingVariants.A;

  const cardTone = timerState.expired
    ? 'border-white/10'
    : timerState.under24h
      ? 'border-amber-400/20 shadow-[0_20px_80px_rgba(245,158,11,0.12)]'
      : 'border-cyan-400/18 shadow-[0_24px_90px_rgba(6,182,212,0.12)]';

  const effectivePriceLabel = useMemo(
    () => (timerState.expired ? pricingCampaign.futurePriceLabel : `${pricingCampaign.introPrice} ${pricingCampaign.billingLabel}`),
    [timerState.expired],
  );

  async function handleClaim(provider) {
    writeSignupState(pricingCampaign.id, true);
    setSignedUp(true);
    trackEvent('pricing_card_claimed', { provider, expired: timerState.expired, variant: variantKey });

    try {
      await fetch('/api/sales/access-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          source: 'pricing_card',
          provider,
          variant: variantKey,
        }),
      });
    } catch {
      // fallback stays local if CRM hook fails
    }
  }

  return (
    <div className={`rounded-[34px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 transition ${cardTone}`}>
      <CountdownTimer
        campaignId={pricingCampaign.id}
        durationDays={pricingCampaign.durationDays}
        onStatusChange={(next) => setTimerState({ expired: next.expired, under24h: next.under24h })}
      />

      <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-amber-200/80">{variant.headline}</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{variant.subheadline}</h2>
        <div className="mt-5 flex items-end gap-3">
          <span className="text-5xl font-semibold text-white">{effectivePriceLabel.split(' ')[0]}</span>
          <span className="pb-2 text-sm text-slate-400">{effectivePriceLabel.replace(effectivePriceLabel.split(' ')[0], '').trim()}</span>
        </div>
        {!timerState.expired ? (
          <p className={`mt-3 text-sm leading-7 ${timerState.under24h ? 'text-amber-100' : 'text-slate-300'}`}>
            {pricingCampaign.urgencyLine}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7 text-slate-400">
            The introductory window has closed. The system continues at the next access tier.
          </p>
        )}

        <div className="mt-5 grid gap-3">
          {valueBullets.map((bullet) => (
            <div key={bullet} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
              {bullet}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[22px] border border-emerald-400/16 bg-emerald-400/[0.06] p-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/80">{pricingCampaign.catBotTitle}</p>
          <p className="mt-2 text-sm font-semibold text-white">{pricingCampaign.catBotSubtitle}</p>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Positioning</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">{variant.supportLine}</p>
        </div>

        <div className="mt-5 grid gap-3">
          {signedUp ? (
            <div className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100">
              You’re in
            </div>
          ) : (
            <>
              <a
                href={timerState.expired ? demoUrl : stripeUrl}
                onClick={() => handleClaim(timerState.expired ? 'expired_demo' : 'stripe')}
                className="inline-flex items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/12 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/18"
              >
                {timerState.expired ? 'Book Demo' : variant.primaryCta}
              </a>
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={paypalUrl}
                  onClick={() => handleClaim('paypal')}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  PayPal
                </a>
                <a
                  href={demoUrl}
                  onClick={() => trackEvent('pricing_demo_clicked', { placement: 'pricing_card' })}
                  className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/18 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/16"
                >
                  Book Demo
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
