export function playAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.25);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
    oscillator.onended = () => {
      context.close().catch(() => {});
    };
  } catch {
    // Audio is optional.
  }
}

function formatAlertNumber(value, digits = 4) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return value.toFixed(digits);
}

export async function loadTelegramSettings() {
  const response = await fetch('/api/telegram/settings', { cache: 'no-store' });
  if (!response.ok) {
    return { enabled: false, configured: false, chatIdPreview: '', hasBotToken: false };
  }
  const payload = await response.json();
  return payload.settings ?? { enabled: false, configured: false, chatIdPreview: '', hasBotToken: false };
}

export async function saveTelegramSettings(settings) {
  return fetch('/api/telegram/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      enabled: Boolean(settings.enabled),
      botToken: settings.botToken?.trim() ?? '',
      chatId: settings.chatId?.trim() ?? '',
    }),
  });
}

export async function sendTelegramAlert(alert) {
  const telegramPayload = {
    title: `${alert.estado === 'HIGH' ? 'BUY ALERT' : 'WATCH ALERT'} · ${alert.symbol}`,
    market: alert.marketType,
    exchange: alert.exchange,
    score: alert.score,
    narrative: alert.narrativeLabel ?? alert.narrative,
    decision: alert.tradePlan?.decision ?? '--',
    avgEntry: formatAlertNumber(alert.tradePlan?.avgEntry, 6),
    stopLoss: formatAlertNumber(alert.tradePlan?.stopPrice, 6),
    tp1: formatAlertNumber(alert.tradePlan?.takeProfits?.[0]?.price, 6),
    tp2: formatAlertNumber(alert.tradePlan?.takeProfits?.[1]?.price, 6),
    tp3: formatAlertNumber(alert.tradePlan?.takeProfits?.[2]?.price, 6),
    riskPct: formatAlertNumber(alert.tradePlan?.maxRiskPct, 2),
    positionSizeUsd: formatAlertNumber(alert.positionSizing?.positionSizeUsd, 2),
    quantity: formatAlertNumber(alert.positionSizing?.quantity, 6),
  };

  const response = await fetch('/api/telegram/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(telegramPayload),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? 'Telegram delivery failed');
  }

  return response.json();
}
