'use client';

import { useEffect, useMemo, useState } from 'react';

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-400">{detail}</p> : null}
    </div>
  );
}

function SequenceBlock({ title, items }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">{title}</p>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={`${title}-${item.subject}`} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-white">{item.subject}</p>
            <p className="mt-1 text-sm text-slate-400">{item.preview}</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
              {item.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalesAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch('/api/sales/admin/summary', { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message ?? 'Failed to load sales admin.');
        if (mounted) setData(json);
      } catch (nextError) {
        if (mounted) setError(nextError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const leads = data?.leads ?? [];
  const metrics = data?.metrics ?? {};
  const topObjections = metrics.topObjections ?? [];
  const ctaPerformance = metrics.ctaPerformance ?? [];
  const stageCounts = Object.entries(metrics.stageCounts ?? {});
  const hotLeads = useMemo(() => leads.filter((lead) => lead.intentLevel === 'hot').slice(0, 6), [leads]);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="glass-panel rounded-[36px] p-8">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Sales Intelligence Desk</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">AMAIA Sales AI Admin</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-400">Internal funnel view for leads, objections, CTA flow, and follow-up sequences.</p>
        </section>
        {loading ? <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-slate-300">Loading sales data...</section> : null}
        {error ? <section className="rounded-[28px] border border-rose-500/20 bg-rose-500/[0.08] p-8 text-rose-100">{error}</section> : null}
        {data ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Leads" value={metrics.totalLeads ?? 0} detail="Stored through the active CRM adapter." />
              <MetricCard label="Qualified" value={metrics.qualified ?? 0} detail="Lead score 45+." />
              <MetricCard label="Hot Intent" value={metrics.hot ?? 0} detail="Ready for demo or trial." />
              <MetricCard label="Conversion" value={`${metrics.conversionRate ?? 0}%`} detail="Qualified to demo/trial CTA." />
            </section>
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Lead Stack</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Recent leads and qualification</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">{leads.length} leads</span>
                </div>
                <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/[0.04] text-left text-[10px] uppercase tracking-[0.24em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Lead</th>
                        <th className="px-4 py-3">Segment</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Intent</th>
                        <th className="px-4 py-3">Next Action</th>
                        <th className="px-4 py-3">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {leads.map((lead) => (
                        <tr key={lead.id} className="bg-white/[0.02]">
                          <td className="px-4 py-3"><p className="font-medium text-white">{lead.name || 'Anonymous'}</p><p className="text-xs text-slate-500">{lead.email || lead.source}</p></td>
                          <td className="px-4 py-3 text-slate-300">{lead.segment}</td>
                          <td className="px-4 py-3 text-white">{lead.leadScore}</td>
                          <td className="px-4 py-3 text-slate-300">{lead.intentLevel}</td>
                          <td className="px-4 py-3 text-slate-200">{lead.recommendedNextAction?.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-slate-300">{lead.stage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Funnel Stages</p>
                  <div className="mt-4 space-y-3">
                    {stageCounts.map(([stage, count]) => (
                      <div key={stage} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                        <span className="text-sm text-slate-300">{stage.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-semibold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Top Objections</p>
                  <div className="mt-4 space-y-3">
                    {topObjections.map((item) => (
                      <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="text-sm text-white">{item.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.count} mentions</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">CTA Performance</p>
                  <div className="mt-4 space-y-3">
                    {ctaPerformance.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                        <span className="text-sm text-slate-300">{item.label.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-semibold text-white">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Hot Lead Snapshot</p>
                <div className="mt-4 space-y-4">
                  {hotLeads.map((lead) => (
                    <div key={lead.id} className="rounded-[22px] border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{lead.name || lead.email || lead.source}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-emerald-200/80">{lead.segment}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white">{lead.leadScore}</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-300">Wants {(lead.profile?.desiredOutcome ?? []).join(', ') || 'cleaner operator flow'}.</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <SequenceBlock title="Abandoned Lead Sequence" items={data.followups.abandonedLead} />
                <SequenceBlock title="Warm Lead Sequence" items={data.followups.warmLead} />
                <SequenceBlock title="Post-Demo Sequence" items={data.followups.postDemo} />
                <SequenceBlock title="Trial to Paid Sequence" items={data.followups.trialToPaid} />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
