const HOT_INTENT_KEYWORDS = ['trial', 'demo', 'pricing', 'book', 'access', 'join', 'buy'];
const WANTS_SCORE_MAP = {
  alerts: 12,
  structure: 14,
  'early detection': 18,
  'hidden activity': 16,
  execution: 10,
};

export function classifySegment(profile) {
  const tools = profile.currentTools ?? [];

  if (
    ['futures', 'both'].includes(profile.marketPreference) &&
    ['daily', 'intraday'].includes(profile.tradingFrequency) &&
    (tools.includes('TradingView') || tools.includes('scanner'))
  ) {
    return 'pro';
  }

  if (['daily', 'weekly', 'swing'].includes(profile.tradingFrequency) || tools.length >= 2) {
    return 'advanced';
  }

  return 'retail';
}

export function scoreLead(profile, conversationText = '') {
  let score = 0;
  const lowerText = conversationText.toLowerCase();

  if (profile.marketPreference === 'futures') score += 16;
  if (profile.marketPreference === 'spot') score += 10;
  if (profile.marketPreference === 'both') score += 20;
  if ((profile.assets ?? []).length >= 2) score += 10;
  if ((profile.assets ?? []).some((asset) => /low|micro|small|ai|depin|gaming/i.test(asset))) score += 8;
  if (profile.tradingFrequency === 'intraday') score += 18;
  if (profile.tradingFrequency === 'daily') score += 15;
  if (profile.tradingFrequency === 'weekly') score += 10;
  if (profile.tradingFrequency === 'swing') score += 12;
  if ((profile.currentTools ?? []).includes('TradingView')) score += 8;
  if ((profile.currentTools ?? []).includes('scanner')) score += 8;
  if ((profile.currentTools ?? []).includes('manual screening')) score += 6;

  for (const struggle of profile.struggles ?? []) {
    if (/late|crowd/i.test(struggle)) score += 12;
    if (/noise|false/i.test(struggle)) score += 10;
    if (/manual/i.test(struggle)) score += 8;
    if (/execution/i.test(struggle)) score += 6;
  }

  for (const want of profile.desiredOutcome ?? []) {
    score += WANTS_SCORE_MAP[want] ?? 6;
  }

  for (const keyword of HOT_INTENT_KEYWORDS) {
    if (lowerText.includes(keyword)) score += 6;
  }

  return Math.max(0, Math.min(100, score));
}

export function classifyIntent(score, conversationText = '') {
  const lowerText = conversationText.toLowerCase();

  if (score >= 75 || /book demo|start trial|trial|pricing|access/i.test(lowerText)) return 'hot';
  if (score >= 45 || /interested|tell me more|how early/i.test(lowerText)) return 'warm';
  return 'cold';
}

export function choosePrimaryCta({ score, intentLevel, segment, escalate }) {
  if (escalate?.required) return 'talk_to_human';
  if (intentLevel === 'hot') return segment === 'pro' ? 'book_demo' : 'start_trial';
  if (intentLevel === 'warm') return score >= 60 ? 'start_trial' : 'book_demo';
  return 'join_waitlist';
}
