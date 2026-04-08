function email(subject, preview, bullets) {
  return { subject, preview, bullets };
}

export function buildFollowupSequences(lead) {
  return {
    abandonedLead: [
      email('You do not need more noise. You need earlier context.', 'A short reminder of why AMAIA exists.', [
        'Most traders chase the move. AMAIA finds it before the crowd.',
        'If you are still screening manually, the cost is usually missed timing and inconsistent coverage.',
        `Recommended next step: ${lead.recommendedNextAction?.replace(/_/g, ' ') ?? 'review fit'}.`,
      ]),
      email('What AMAIA actually replaces in your workflow', 'A tighter explanation for skeptical leads.', [
        'It does not replace charting discipline.',
        'It replaces noisy manual discovery and fragmented cross-exchange monitoring.',
        'It gives structure, context, and earlier setup visibility.',
      ]),
    ],
    warmLead: [
      email('The edge is not speed alone. It is structured early visibility.', 'Reinforce the operator case.', [
        'AMAIA is strongest when you already know how to execute but want better upstream context.',
        'Spot, Futures, alerting, and guided execution live in one desk.',
        'If you want, the next step is a clean trial or a focused demo.',
      ]),
    ],
    postDemo: [
      email('Your workflow after the demo', 'Summarize operational value.', [
        'Use the radar to narrow the universe.',
        'Validate on the chart and plan entries with discipline.',
        'Use Cat Bot and alerts to pressure-test conviction before capital.',
      ]),
    ],
    trialToPaid: [
      email('Private access. Operator edge.', 'Move from trial to committed workflow.', [
        'Keep the scanner, AI guidance, execution plan, and alerting in one stack.',
        'If the process already saves time and improves decision quality, keep that edge compounding.',
        'Trade with process, not emotion.',
      ]),
    ],
  };
}
