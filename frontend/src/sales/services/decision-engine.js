const escalationRules = [
  { pattern: /enterprise|institutional|team access|desk access/i, reason: 'enterprise_access' },
  { pattern: /partnership|affiliate|white label/i, reason: 'partnership_request' },
  { pattern: /integration|api|webhook|custom build/i, reason: 'technical_integration' },
  { pattern: /refund|billing|invoice|chargeback|cancel my payment/i, reason: 'billing_dispute' },
  { pattern: /discount|negotiate|better price|custom pricing/i, reason: 'pricing_negotiation' },
];

export function detectEscalation(text = '', lead) {
  const match = escalationRules.find((item) => item.pattern.test(text));
  if (!match) return { required: false, reason: null, summary: null };

  return {
    required: true,
    reason: match.reason,
    summary: {
      leadScore: lead.leadScore,
      intentLevel: lead.intentLevel,
      objections: lead.objections,
      context: (lead.conversation ?? []).slice(-6),
      reason: match.reason,
    },
  };
}

export function getDecisionCopy({ intentLevel, recommendedNextAction }) {
  if (recommendedNextAction === 'talk_to_human') {
    return 'This is better handled by a human operator. I will package the context so the handoff is fast and precise.';
  }
  if (intentLevel === 'hot') {
    return 'You look close to action. I will keep this tight and push the shortest path to evaluation.';
  }
  if (intentLevel === 'warm') {
    return 'There is enough fit to educate with precision and then move to a concrete next step.';
  }
  return 'The right move here is nurture first: clarify workflow, build authority, then offer a lower-friction CTA.';
}
