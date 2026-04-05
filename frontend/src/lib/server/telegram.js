import crypto from 'node:crypto';

const TELEGRAM_COOKIE = 'amaia-telegram-settings';

function getSecret() {
  return (
    process.env.AMAIA_TELEGRAM_SETTINGS_SECRET ??
    process.env.AMAIA_ADMIN_PASSWORD ??
    'amaia-telegram-local-secret'
  );
}

function getKey() {
  return crypto.createHash('sha256').update(getSecret()).digest();
}

export function getTelegramCookieName() {
  return TELEGRAM_COOKIE;
}

export function encryptTelegramSettings(settings) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const plaintext = JSON.stringify({
    enabled: Boolean(settings.enabled),
    botToken: settings.botToken?.trim() ?? '',
    chatId: settings.chatId?.trim() ?? '',
  });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptTelegramSettings(serializedValue) {
  if (!serializedValue) {
    return { enabled: false, botToken: '', chatId: '' };
  }

  try {
    const buffer = Buffer.from(serializedValue, 'base64url');
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(decrypted);
    return {
      enabled: Boolean(parsed.enabled),
      botToken: parsed.botToken ?? '',
      chatId: parsed.chatId ?? '',
    };
  } catch {
    return { enabled: false, botToken: '', chatId: '' };
  }
}

export function sanitizeTelegramSettings(settings) {
  return {
    enabled: Boolean(settings.enabled),
    configured: Boolean(settings.botToken && settings.chatId),
    chatIdPreview: settings.chatId ? `${settings.chatId.slice(0, 3)}***${settings.chatId.slice(-2)}` : '',
    hasBotToken: Boolean(settings.botToken),
  };
}
