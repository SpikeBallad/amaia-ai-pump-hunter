import { closerPrompt } from '@/src/sales/prompts/closer';
import { retentionPrompt } from '@/src/sales/prompts/retention';
import { sdrPrompt } from '@/src/sales/prompts/sdr';
import { classifyIntent, classifySegment, choosePrimaryCta, scoreLead } from '@/src/sales/scoring/lead-score';
import { detectEscalation, getDecisionCopy } from '@/src/sales/services/decision-engine';
import { handleObjection } from '@/src/sales/services/objection-engine';

export const SALES_INITIAL_MESSAGE = "I’m AMAIA Sales AI. I’ll help you determine if this platform gives you a real edge.";

const CTA_CONFIG = {
  start_trial: { label: 'Start Trial', href: process.env.NEXT_PUBLIC_SALES_TRIAL_URL ?? '/login' },
  book_demo: { label: 'Book Demo', href: process.env.NEXT_PUBLIC_SALES_DEMO_URL ?? '/onboarding' },
  join_waitlist: { label: 'Join Waitlist', href: process.env.NEXT_PUBLIC_SALES_WAITLIST_URL ?? '/onboarding' },
  talk_to_human: {
    label: 'Talk to Human',
    href: process.env.NEXT_PUBLIC_SALES_HUMAN_URL ?? `mailto:${process.env.AMAIA_SALES_HUMAN_EMAIL ?? 'sales@amaia.ai'}`,
  },
};

const QUESTION_FLOW = [
  { key: 'marketPreference', question: 'Do you mainly trade spot, futures, or both?' },
  { key: 'assets', question: 'Which assets or sectors do you focus on most right now?' },
  { key: 'tradingFrequency', question: 'How often do you trade: intraday, daily, weekly, or more selectively?' },
  { key: 'currentTools', question: 'What do you currently rely on for decision-making: TradingView, scanners, manual screening, or something else?' },
  { key: 'struggles', question: 'What is the biggest friction in your workflow today: late entries, too much noise, weak structure, or something else?' },
  { key: 'desiredOutcome', question: 'What matters most to you: earlier alerts, cleaner structure, hidden activity detection, or execution guidance?' },
];

function normalizeAsset(raw) {
  const cleaned = raw.replace(/[^a-z0-9/]/gi, '').toUpperCase();
  if (!cleaned) return null;
  if (cleaned.endsWith('USDT')) return cleaned;
  if (cleaned.includes('/')) return cleaned;
  return `${cleaned}USDT`;
}

function inferAssets(message) {
  const matches = message.match(/\b[A-Za-z]{2,10}(?:USDT)?\b/g) ?? [];
  return [...new Set(matches.map(normalizeAsset).filter(Boolean))].slice(0, 6);
}

function inferList(message, map) {
  return Object.entries(map)
    .filter(([, pattern]) => pattern.test(message))
    .map(([value]) => value);
}

function inferProfile(profile, message) {
  const lower = message.toLowerCase();
  const next = {
    ...profile,
    assets: [...(profile.assets ?? [])],
    currentTools: [...(profile.currentTools ?? [])],
    struggles: [...(profile.struggles ?? [])],
    desiredOutcome: [...(profile.desiredOutcome ?? [])],
  };

  if (!next.marketPreference) {
    if (/both|all/i.test(lower)) next.marketPreference = 'both';
    else if (/future|perp|perpetual/i.test(lower)) next.marketPreference = 'futures';
    else if (/spot/i.test(lower)) next.marketPreference = 'spot';
  }

  if (!next.tradingFrequency) {
    if (/intraday|scalp/i.test(lower)) next.tradingFrequency = 'intraday';
    else if (/daily|every day/i.test(lower)) next.tradingFrequency = 'daily';
    else if (/swing/i.test(lower)) next.tradingFrequency = 'swing';
    else if (/weekly|few times a week/i.test(lower)) next.tradingFrequency = 'weekly';
    else if (/occasional|selective|sometimes/i.test(lower)) next.tradingFrequency = 'selective';
  }

  next.assets = [...new Set([...next.assets, ...inferAssets(message)])];
  next.currentTools = [...new Set([...next.currentTools, ...inferList(message, {
    TradingView: /tradingview/i,
    scanner: /scanner|screener/i,
    'manual screening': /manual|manually/i,
    discord: /discord|telegram groups?/i,
    exchange: /binance|mexc|bybit/i,
  })])];
  next.struggles = [...new Set([...next.struggles, ...inferList(message, {
    'late entries': /late|after the move/i,
    'too much noise': /noise|too many charts|too many alerts/i,
    'weak structure': /weak structure|unclear structure|messy structure/i,
    'manual scanning takes too long': /manual|time consuming|takes too long/i,
    'execution inconsistency': /execution|discipline|consistency/i,
  })])];
  next.desiredOutcome = [...new Set([...next.desiredOutcome, ...inferList(message, {
    alerts: /alert/i,
    structure: /structure|cleaner setups/i,
    'early detection': /early|before the crowd|before breakout/i,
    'hidden activity': /hidden|accumulation|liquidity trap/i,
    execution: /entry|execution|take profit|risk/i,
  })])];

  const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) next.email = emailMatch[0];
  const nameMatch = message.match(/\b(?:i am|i'm|soy|me llamo)\s+([A-Za-zÀ-ÿ'-]{2,20})/i);
  if (nameMatch && !next.name) next.name = nameMatch[1];

  return next;
}

function getNextQuestion(profile) {
  return QUESTION_FLOW.find((item) => {
    const value = profile[item.key];
    return Array.isArray(value) ? value.length === 0 : !value;
  });
}

function selectPromptMode(intentLevel) {
  if (intentLevel === 'hot') return closerPrompt;
  if (intentLevel === 'warm') return sdrPrompt;
  return retentionPrompt;
}

function buildStage(intentLevel, primaryCta, escalate) {
  if (escalate?.required) return 'escalated';
  if (['book_demo', 'start_trial'].includes(primaryCta)) return 'qualified';
  if (intentLevel === 'warm') return 'nurturing';
  return 'new';
}

export function runSalesConversation(lead, userMessage) {
  const nextProfile = inferProfile(lead.profile ?? {}, userMessage);
  const objectionResult = handleObjection(userMessage);
  const conversationText = `${(lead.conversation ?? []).map((item) => item.content).join(' ')} ${userMessage}`;
  const leadScore = scoreLead(nextProfile, conversationText);
  const intentLevel = classifyIntent(leadScore, conversationText);
  const segment = classifySegment(nextProfile);
  const interimLead = {
    ...lead,
    profile: nextProfile,
    objections: [...new Set([...(lead.objections ?? []), ...(objectionResult?.objections ?? [])])],
    leadScore,
    intentLevel,
    segment,
  };
  const escalation = detectEscalation(userMessage, interimLead);
  const recommendedNextAction = choosePrimaryCta({ score: leadScore, intentLevel, segment, escalate: escalation });
  const stage = buildStage(intentLevel, recommendedNextAction, escalation);
  const question = getNextQuestion(nextProfile);
  const primaryCta = CTA_CONFIG[recommendedNextAction] ?? CTA_CONFIG.join_waitlist;
  const decisionCopy = getDecisionCopy({ intentLevel, recommendedNextAction });
  const promptMode = selectPromptMode(intentLevel);

  let content = '';
  if (escalation.required) {
    content = 'This request should be handled by a human operator. I have packaged your context so the handoff stays precise and fast. Use the action below and a human will continue from the right context.';
  } else if (objectionResult) {
    content = `${objectionResult.response} ${question ? question.question : `Based on what you've shared, AMAIA looks most relevant as a ${segment} workflow upgrade. ${decisionCopy}`}`;
  } else if (question) {
    content = `${decisionCopy} ${question.question}`;
  } else {
    content = `You look like a ${segment} fit with ${intentLevel} intent. AMAIA is strongest when you want earlier market context, cleaner setup selection, and a more disciplined path from scan to action. ${decisionCopy}`;
  }

  return {
    lead: {
      ...interimLead,
      escalation,
      recommendedNextAction,
      stage,
      updatedAt: new Date().toISOString(),
    },
    reply: {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      disclosure: 'AI assistant',
    },
    meta: {
      leadScore,
      intentLevel,
      segment,
      recommendedNextAction,
      primaryCta,
      escalation,
      promptMode,
    },
  };
}
