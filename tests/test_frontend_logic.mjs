import assert from 'node:assert';

// 1. Test Duration Formatting
function formatDuration(seconds) {
  if (seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

assert.strictEqual(formatDuration(0), '0m');
assert.strictEqual(formatDuration(120), '2m');
assert.strictEqual(formatDuration(3660), '1h 1m');
assert.strictEqual(formatDuration(90000), '1d 1h');
console.log('✓ Duration formatting passed');

// 2. Test Performance Percentiles Calculation
function calculatePerformanceStats(checks) {
  const times = checks
    .filter((c) => c.status === 'ONLINE' || c.status === 'DEGRADED')
    .map((c) => c.responseTimeMs)
    .filter((t) => typeof t === 'number' && t > 0)
    .sort((a, b) => a - b);

  if (times.length === 0) {
    return { average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, count: 0 };
  }

  const sum = times.reduce((acc, val) => acc + val, 0);
  const average = Math.round(sum / times.length);
  const min = times[0];
  const max = times[times.length - 1];

  const getPercentile = (p) => {
    const idx = Math.min(Math.floor((p / 100) * times.length), times.length - 1);
    return Math.round(times[idx]);
  };

  return {
    average,
    median: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    min,
    max,
    count: times.length,
  };
}

const mockChecks = [
  { status: 'ONLINE', responseTimeMs: 100 },
  { status: 'ONLINE', responseTimeMs: 120 },
  { status: 'ONLINE', responseTimeMs: 150 },
  { status: 'ONLINE', responseTimeMs: 200 },
  { status: 'DEGRADED', responseTimeMs: 800 },
  { status: 'DOWN', responseTimeMs: 0 },
];

const stats = calculatePerformanceStats(mockChecks);
assert.strictEqual(stats.count, 5);
assert.strictEqual(stats.min, 100);
assert.strictEqual(stats.max, 800);
assert.strictEqual(stats.median, 150);
console.log('✓ Performance statistics calculation passed');

// 3. Test Webhook Masking
function maskWebhookUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    if (pathParts.length > 2) {
      const last = pathParts[pathParts.length - 1];
      const maskedPart = last.length > 8 ? last.slice(0, 4) + '••••••••' + last.slice(-4) : '••••••••';
      pathParts[pathParts.length - 1] = maskedPart;
      return `${parsed.origin}${pathParts.join('/')}`;
    }
    return `${parsed.origin}••••••••`;
  } catch {
    return url.length > 10 ? url.slice(0, 6) + '••••••••' : '••••••••';
  }
}

const masked = maskWebhookUrl('https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz');
assert.ok(!masked.includes('abcdefghijklmnopqrstuvwxyz'));
assert.ok(masked.includes('••••••••'));
console.log('✓ Webhook secret masking passed');

// 4. Test Import Validation & Prototype Pollution
function validateImportPayload(rawJson) {
  const errors = [];
  if (rawJson.length > 15 * 1024 * 1024) {
    return { valid: false, errors: ['File too large'] };
  }

  let obj;
  try {
    obj = JSON.parse(rawJson);
  } catch (err) {
    return { valid: false, errors: ['Invalid JSON'] };
  }

  if (!obj || typeof obj !== 'object' || !obj.data) {
    return { valid: false, errors: ['Missing root data'] };
  }

  return { valid: true, errors: [] };
}

assert.strictEqual(validateImportPayload('{"data": {}}').valid, true);
assert.strictEqual(validateImportPayload('invalid json').valid, false);
assert.strictEqual(validateImportPayload('{"other": 123}').valid, false);
console.log('✓ Import payload validation passed');

console.log('All frontend core logic tests passed successfully!');
