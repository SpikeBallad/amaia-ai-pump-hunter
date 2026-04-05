const TELEGRAM_SETTINGS_KEY = 'amaia.telegram.settings';

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

export function loadTelegramSettings() {
  if (typeof window === 'undefined') {
    return { enabled: false, botToken: '', chatId: '' };
  }

  try {
    const rawValue = window.localStorage.getItem(TELEGRAM_SETTINGS_KEY);
    if (!rawValue) {
      return { enabled: false, botToken: '', chatId: '' };
    }
    const parsedValue = JSON.parse(rawValue);
    return {
      enabled: Boolean(parsedValue.enabled),
      botToken: parsedValue.botToken ?? '',
      chatId: parsedValue.chatId ?? '',
    };
  } catch {
    return { enabled: false, botToken: '', chatId: '' };
  }
}

export function saveTelegramSettings(settings) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    enabled: Boolean(settings.enabled),
    botToken: settings.botToken?.trim() ?? '',
    chatId: settings.chatId?.trim() ?? '',
  };
  window.localStorage.setItem(TELEGRAM_SETTINGS_KEY, JSON.stringify(payload));
}

export async function sendTelegramAlert(alert) {
  const settings = loadTelegramSettings();
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

  if (!settings.enabled || !settings.botToken || !settings.chatId) {
    console.info('Telegram alert placeholder', telegramPayload);
    return { ok: true, status: 'disabled' };
  }

  const message = [
    telegramPayload.title,
    `Market: ${telegramPayload.market}`,
    `Exchange: ${telegramPayload.exchange}`,
    `Score: ${telegramPayload.score}`,
    `Narrative: ${telegramPayload.narrative}`,
    `Decision: ${telegramPayload.decision}`,
    `Avg Entry: ${telegramPayload.avgEntry}`,
    `Stop Loss: ${telegramPayload.stopLoss}`,
    `TP1: ${telegramPayload.tp1}`,
    `TP2: ${telegramPayload.tp2}`,
    `TP3: ${telegramPayload.tp3}`,
    `Risk %: ${telegramPayload.riskPct}`,
    `Position Size USD: ${telegramPayload.positionSizeUsd}`,
    `Quantity: ${telegramPayload.quantity}`,
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: settings.chatId,
      text: message,
    }),
  });

  if (!response.ok) {
    throw new Error('Telegram delivery failed');
  }

  return response.json();
}
