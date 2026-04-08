'use client';

import { useEffect, useState } from 'react';

import { ensureCampaignEnd, getTimeRemaining, padTime } from '@/src/lib/time';

export default function CountdownTimer({ campaignId, durationDays, onStatusChange }) {
  const [time, setTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
    under24h: false,
  });

  useEffect(() => {
    const endAt = ensureCampaignEnd(campaignId, durationDays);
    if (!endAt) return undefined;

    const update = () => {
      const next = getTimeRemaining(endAt);
      setTime(next);
      onStatusChange?.(next);
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [campaignId, durationDays, onStatusChange]);

  const tone = time.expired
    ? 'border-white/10 bg-white/[0.04] text-slate-300'
    : time.under24h
      ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
      : 'border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-100';

  return (
    <div className={`rounded-[24px] border px-4 py-4 transition ${tone}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Access Window</p>
          <p className="mt-2 text-sm font-semibold">{time.expired ? 'Offer expired' : 'Time remaining for early access'}</p>
        </div>
        {!time.expired ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Days', value: padTime(time.days) },
              { label: 'Hours', value: padTime(time.hours) },
              { label: 'Minutes', value: padTime(time.minutes) },
              { label: 'Seconds', value: padTime(time.seconds) },
            ].map((item) => (
              <div key={item.label} className="min-w-[58px] rounded-[18px] border border-white/10 bg-white/[0.05] px-2 py-2">
                <p className="text-lg font-semibold text-white">{item.value}</p>
                <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
