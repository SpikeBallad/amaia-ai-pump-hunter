const objectionLibrary = [
  {
    pattern: /already use tradingview|already have tradingview/i,
    label: 'I already use TradingView',
    response:
      'TradingView is strong for charting. AMAIA sits upstream of that workflow: it filters for cross-exchange accumulation, pre-move structure, and ignored setups before you spend time manually validating them.',
  },
  {
    pattern: /just another scanner|another scanner/i,
    label: 'This is just another scanner',
    response:
      'Generic scanners surface noise. AMAIA is built around a narrower objective: identify structure that matters before the crowd reacts, then convert it into an execution-ready decision framework.',
  },
  {
    pattern: /why should i pay|why pay/i,
    label: 'Why should I pay?',
    response:
      'If your current process already isolates hidden structure early and consistently, you may not need it. The value is in compressing research time, reducing noisy chart hopping, and upgrading how quickly you reach a disciplined decision.',
  },
  {
    pattern: /how early|how soon|how fast does it detect/i,
    label: 'How early does it detect moves?',
    response:
      'AMAIA is designed to detect accumulation, compression, and trap behavior before expansion, not after confirmation candles attract attention. It is an intelligence layer for earlier context, not a guarantee of any move.',
  },
  {
    pattern: /do this manually|manual/i,
    label: 'Can I just do this manually?',
    response:
      'Yes. Skilled traders can do parts of this manually. AMAIA exists to reduce the time cost, increase consistency across exchanges, and keep your decision process structured when the universe gets too wide for clean manual coverage.',
  },
  {
    pattern: /low caps|small caps|microcaps/i,
    label: 'Does it work on low caps?',
    response:
      'Low-attention assets are part of the edge. AMAIA is explicitly built to surface ignored structures, but still applies filters so you do not confuse thin noise with meaningful pre-move behavior.',
  },
  {
    pattern: /is this signals|signal group/i,
    label: 'Is this signals?',
    response:
      'No. AMAIA is not a signal group. It is a decision system: scan, validate structure, inspect the chart, assess the setup, and only then act if the process supports it.',
  },
];

export function detectObjections(text = '') {
  return objectionLibrary.filter((item) => item.pattern.test(text));
}

export function handleObjection(text = '') {
  const matches = detectObjections(text);
  if (!matches.length) return null;
  return {
    objections: matches.map((item) => item.label),
    response: matches.map((item) => item.response).join(' '),
  };
}
