'use client';

import { useMemo, useState } from 'react';

import { useMarket } from '@/src/context/MarketContext';

const quickActions = [
  { id: 'market-brief', label: 'Market Brief' },
  { id: 'smart-usage', label: 'How to Use' },
  { id: 'best-filters', label: 'Best Filters' },
  { id: 'decision-guide', label: 'Decision Guide' },
  { id: 'metric-guide', label: 'Metric Guide' },
  { id: 'pro-mode', label: 'Pro Mode' },
];

function formatMarketName(value) {
  if (!value) return 'unknown market';
  return value.replaceAll('_', ' ').toLowerCase();
}

function buildInitialMessage(context) {
  const strongest = context.strongestRow;
  const watchlistCount = context.watchlistRows.length;

  return {
    id: 'welcome',
    role: 'assistant',
    title: 'Amaia AI Copilot',
    content: strongest
      ? `Estoy viendo ${strongest.symbol} como foco principal en ${formatMarketName(strongest.marketType ?? strongest.market_type)}. Ahora mismo tienes ${context.summary.highCount} setups HIGH y ${watchlistCount} candidatos en pre-pump watchlist. Puedo explicarte cómo leer el panel, qué filtros convienen más y cómo priorizar decisiones sin perseguir activos ya bombeados.`
      : 'Estoy listo para guiarte con la plataforma. Puedo explicarte cómo usar los módulos, leer las métricas del scanner y sugerirte una rutina inteligente para filtrar setups con mejor relación atención/estructura.',
  };
}

function buildAssistantReply(actionId, context) {
  const strongest = context.strongestRow;
  const filteredRows = context.filteredRows;
  const watchlistRows = context.watchlistRows;
  const moduleLabelMap = {
    all: 'All Setups',
    spot: 'Spot Opportunities',
    futures: 'Futures Setups',
    watchlist: 'Pre-Pump Watchlist',
  };

  if (actionId === 'market-brief') {
    if (!strongest) {
      return {
        title: 'Market Brief',
        content:
          'Ahora mismo no tengo un setup dominante en pantalla. Mi recomendación es empezar por All Setups con score mínimo 5, luego revisar qué activos pasan a Pre-Pump Watchlist antes de buscar rupturas.',
      };
    }

    return {
      title: 'Market Brief',
      content: `${strongest.symbol} lidera la misión actual con score ${strongest.score}, dump de ${strongest.dumpPct ?? strongest.dump_pct ?? '--'}% y rango de ${strongest.rangePct ?? strongest.range_pct ?? '--'}%. El patrón de volumen es ${strongest.volumePattern ?? strongest.volume_pattern ?? 'sin clasificar'} y su estado operativo es ${strongest.statusLabel ?? strongest.status_label ?? strongest.estado}. Úsalo como ancla para comparar el resto del universo.`,
    };
  }

  if (actionId === 'smart-usage') {
    return {
      title: 'How to Use Amaia',
      content:
        'Rutina inteligente: 1. Empieza en All Setups para ver el mapa completo. 2. Sube el score mínimo a 6 para limpiar ruido. 3. Revisa Spot si quieres estructuras más limpias; usa Futures para setups más agresivos. 4. Cierra con Pre-Pump Watchlist para quedarte solo con activos score >= 8 que aún no han roto. 5. Evita perseguir cualquier activo con 24h_change > 25, porque el motor ya te está ayudando a filtrar los charts tardíos.',
    };
  }

  if (actionId === 'best-filters') {
    const suggestedModule =
      watchlistRows.length > 0
        ? 'watchlist'
        : context.summary.futuresCount > context.summary.spotCount
          ? 'futures'
          : 'spot';

    return {
      title: 'Best Filters Right Now',
      content: `Sugerencia actual: usa ${moduleLabelMap[suggestedModule]} con exchange en ${context.exchangeFilter === 'all' ? 'All Venues' : context.exchangeFilter}, score mínimo entre 6 y 8, y narrativa ${context.narrativeFilter}. Si quieres encontrar joyas más ignoradas, combina low-cap manualmente observando dump alto, ATR ratio bajo y volumen en compresión.`,
    };
  }

  if (actionId === 'decision-guide') {
    return {
      title: 'Decision Guide',
      content:
        'Checklist pro antes de actuar: 1. Dump >= 70%. 2. Range <= 15%. 3. ATR ratio <= 0.02. 4. Volume pattern con compresión y spike, no expansión caótica. 5. EMA flattening confirmado. 6. Si el estado es Pre-Breakout, prepara vigilancia; si es Breakout Starting, ya no persigas sin plan. 7. Si el activo no está en watchlist y además subió demasiado en 24h, déjalo ir.',
    };
  }

  if (actionId === 'metric-guide') {
    return {
      title: 'Metric Guide',
      content:
        'Dump % mide cuánto ha caído desde el high del ciclo. Range % mide lo apretado de la acumulación reciente. ATR ratio mide volatilidad relativa; cuanto más bajo, mejor para compresión. Volume pattern te dice si hay silencio útil o expansión. Status Label te orienta en la fase: Accumulation es observación, Pre-Breakout es preparación, Breakout Starting es confirmación temprana.',
    };
  }

  return {
    title: 'Pro Mode',
    content: `Modo pro sugerido: usa ${moduleLabelMap[context.moduleFilter]} como tablero principal, mantén score mínimo en ${Math.max(6, context.scoreFilter)}, prioriza setups low-cap y silent-market, y usa la watchlist como inbox táctico. Si tienes ${filteredRows.length} activos visibles, tu objetivo no es verlos todos: es quedarte con los 3 a 5 que combinan mejor dump profundo, compresión real y baja atención de mercado.`,
  };
}

function MessageBubble({ item }) {
  const isAssistant = item.role === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[92%] rounded-[24px] border px-4 py-3 ${
          isAssistant
            ? 'border-cyan-400/15 bg-cyan-500/10 text-slate-100'
            : 'border-white/10 bg-white/[0.05] text-slate-200'
        }`}
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-current/70">{item.title}</p>
        <p className="mt-2 text-sm leading-7">{item.content}</p>
      </div>
    </div>
  );
}

export default function AmaiaCopilotPanel() {
  const {
    filteredRows,
    topPanelRows,
    watchlistRows,
    summary,
    moduleFilter,
    exchangeFilter,
    marketTypeFilter,
    narrativeFilter,
    scoreFilter,
  } = useMarket();

  const strongestRow = filteredRows[0] ?? topPanelRows[0] ?? null;

  const context = useMemo(
    () => ({
      filteredRows,
      topPanelRows,
      watchlistRows,
      strongestRow,
      summary,
      moduleFilter,
      exchangeFilter,
      marketTypeFilter,
      narrativeFilter,
      scoreFilter,
    }),
    [
      exchangeFilter,
      filteredRows,
      marketTypeFilter,
      moduleFilter,
      narrativeFilter,
      scoreFilter,
      strongestRow,
      summary,
      topPanelRows,
      watchlistRows,
    ]
  );

  const [messages, setMessages] = useState(() => [buildInitialMessage(context)]);

  function handleQuickAction(actionId) {
    const selectedAction = quickActions.find((action) => action.id === actionId);
    const reply = buildAssistantReply(actionId, context);

    setMessages((previous) => [
      ...previous,
      {
        id: `${actionId}-user-${Date.now()}`,
        role: 'user',
        title: 'Operator',
        content: selectedAction?.label ?? actionId,
      },
      {
        id: `${actionId}-assistant-${Date.now() + 1}`,
        role: 'assistant',
        title: reply.title,
        content: reply.content,
      },
    ]);
  }

  return (
    <section className="glass-panel rounded-[36px] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Amaia AI</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Copilot Command Chat</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Asistente táctico para entender la app, interpretar setups y tomar decisiones con más disciplina. Te guía
            sobre módulos, filtros, watchlist y lectura de métricas sin perseguir charts ya explotados.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Smart context: {summary.visibleCount} visibles · {summary.highCount} HIGH · {watchlistRows.length} watchlist
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => handleQuickAction(action.id)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-white"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3 rounded-[30px] border border-white/10 bg-slate-950/70 p-4">
          {messages.slice(-6).map((message) => (
            <MessageBubble key={message.id} item={message} />
          ))}
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Operating Manual</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p>1. Empieza en <span className="text-white">All Setups</span> para tener visión completa del mapa.</p>
              <p>2. Pasa a <span className="text-white">Spot</span> si buscas estructuras más limpias y a <span className="text-white">Futures</span> si quieres setups más agresivos.</p>
              <p>3. Cierra siempre en <span className="text-white">Pre-Pump Watchlist</span> para quedarte con la shortlist de mayor calidad.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Pro Suggestions</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p>Activa una rutina de revisión cada 30-60s solo para watchlist y deja All Setups como radar amplio.</p>
              <p>Usa score 6-7 para discovery y score 8+ para vigilancia táctica.</p>
              <p>Prioriza los activos low-cap y silent-market cuando el objetivo sea encontrar estructuras ignoradas.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-500/20 bg-cyan-500/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Next Pro Layer</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-cyan-50">
              <p>Mi sugerencia siguiente es añadir chart view interactivo por activo con zona de acumulación, EMA20, EMA50 y marcas de liquidity trap.</p>
              <p>Después de eso, conviene activar alertas filtrables por market, exchange y score para convertir el dashboard en una mesa operativa real.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
