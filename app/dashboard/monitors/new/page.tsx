'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Zap,
  Sliders,
  Bell,
  Activity,
  AlertCircle,
  Clock,
  Play,
  Server,
  Globe2,
} from 'lucide-react';
import { createMonitor } from '@/lib/storage/monitors';
import { getIntegrations } from '@/lib/storage/integrations';
import { Monitor, MonitorType, HttpMethod, Integration } from '@/lib/types';
import { globalScheduler } from '@/lib/monitoring/scheduler';
import { useToast } from '@/components/ui/Toast';

export default function AddMonitorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [integrationsList, setIntegrationsList] = useState<Integration[]>([]);

  // Step 1: Basic
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [monitorType, setMonitorType] = useState<MonitorType>('http');

  // Step 2: Request
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [userAgent, setUserAgent] = useState('Pulse/1.0 (+https://pulse.monitor)');
  const [followRedirects, setFollowRedirects] = useState(true);

  // Step 3: Monitoring settings
  const [interval, setIntervalVal] = useState(60);
  const [timeout, setTimeoutVal] = useState(10);
  const [retryCount, setRetryCount] = useState(2);
  const [retryDelay, setRetryDelay] = useState(5);
  const [failureThreshold, setFailureThreshold] = useState(2);
  const [recoveryThreshold, setRecoveryThreshold] = useState(1);
  const [slowResponseThreshold, setSlowResponseThreshold] = useState(1500);

  // Step 4: Validation & Assertions
  const [keywordExpected, setKeywordExpected] = useState('');
  const [keywordOperator, setKeywordOperator] = useState<'contains' | 'not_contains'>('contains');
  const [jsonPath, setJsonPath] = useState('');
  const [jsonOperator, setJsonOperator] = useState('equals');
  const [jsonExpectedValue, setJsonExpectedValue] = useState('');
  const [expectedStatusCodesStr, setExpectedStatusCodesStr] = useState('200, 201, 204');

  // Test request status
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Step 5: Notifications
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    getIntegrations().then(setIntegrationsList);
    try {
      const raw = localStorage.getItem('pulse_monitor_draft_v1');
      if (raw) {
        const d = JSON.parse(raw);
        if (d.name) setName(d.name);
        if (d.url) setUrl(d.url);
        if (d.description) setDescription(d.description);
        if (d.tagsInput) setTagsInput(d.tagsInput);
        if (d.monitorType) setMonitorType(d.monitorType);
      }
    } catch {}
  }, []);

  // Save draft on edit
  useEffect(() => {
    try {
      localStorage.setItem(
        'pulse_monitor_draft_v1',
        JSON.stringify({ name, url, description, tagsInput, monitorType })
      );
    } catch {}
  }, [name, url, description, tagsInput, monitorType]);

  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (!name.trim()) {
      try {
        const parsed = new URL(val.startsWith('http') ? val : `https://${val}`);
        if (parsed.hostname) {
          setName(parsed.hostname);
        }
      } catch {}
    }
  };

  const handleRunPreFlightTest = async () => {
    if (!url.trim()) {
      toast('Please enter a target URL first', 'error');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      if (monitorType === 'ssl') {
        const res = await fetch('/api/check/ssl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim(), timeout }),
        });
        const data = await res.json();
        setTestResult({
          type: 'ssl',
          success: data.success && data.valid,
          details: data,
        });
      } else {
        let parsedHeaders: Record<string, string> = { 'User-Agent': userAgent };
        if (headersText.trim()) {
          try {
            parsedHeaders = { ...parsedHeaders, ...JSON.parse(headersText) };
          } catch {
            headersText.split('\n').forEach((line) => {
              const [k, ...v] = line.split(':');
              if (k && v.length) parsedHeaders[k.trim()] = v.join(':').trim();
            });
          }
        }

        const statusCodes = expectedStatusCodesStr
          .split(',')
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n));

        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim(),
            method,
            headers: parsedHeaders,
            body: bodyText.trim() || undefined,
            timeout,
            follow_redirects: followRedirects,
            expected_status_codes: statusCodes.length > 0 ? statusCodes : undefined,
            monitor_type: monitorType,
            keyword_assertion:
              monitorType === 'keyword' && keywordExpected.trim()
                ? { expected: keywordExpected.trim(), operator: keywordOperator }
                : undefined,
            json_assertion:
              monitorType === 'json' && jsonPath.trim()
                ? { path: jsonPath.trim(), operator: jsonOperator, value: jsonExpectedValue }
                : undefined,
          }),
        });
        const data = await res.json();
        setTestResult({
          type: 'http',
          success: data.success,
          details: data,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        details: { error: { message: err.message || 'Connection failed' } },
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    let targetUrl = url.trim();
    if (!targetUrl) {
      toast('Please enter a target URL', 'error');
      setStep(1);
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
      setUrl(targetUrl);
    }

    let monitorName = name.trim();
    if (!monitorName) {
      try {
        const parsed = new URL(targetUrl);
        monitorName = parsed.hostname;
        setName(monitorName);
      } catch {
        monitorName = targetUrl;
      }
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const statusCodes = expectedStatusCodesStr
        .split(',')
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));

      let parsedHeaders: Record<string, string> = { 'User-Agent': userAgent };
      if (headersText.trim()) {
        try {
          parsedHeaders = { ...parsedHeaders, ...JSON.parse(headersText) };
        } catch {
          headersText.split('\n').forEach((line) => {
            const [k, ...v] = line.split(':');
            if (k && v.length) parsedHeaders[k.trim()] = v.join(':').trim();
          });
        }
      }

      const newMonitor: Monitor = {
        id: `mon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: monitorName,
        url: targetUrl,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        monitorType,
        method,
        headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
        body: bodyText.trim() || undefined,
        interval: Number(interval) || 60,
        timeout: Number(timeout) || 10,
        retryCount: Number(retryCount) || 2,
        retryDelay: Number(retryDelay) || 5,
        failureThreshold: Number(failureThreshold) || 2,
        recoveryThreshold: Number(recoveryThreshold) || 1,
        slowResponseThreshold: Number(slowResponseThreshold) || 1500,
        followRedirects,
        expectedStatusCodes: statusCodes.length > 0 ? statusCodes : [200, 201, 204],
        keywordAssertion:
          monitorType === 'keyword' && keywordExpected.trim()
            ? { expected: keywordExpected.trim(), operator: keywordOperator }
            : undefined,
        jsonAssertion:
          monitorType === 'json' && jsonPath.trim()
            ? { path: jsonPath.trim(), operator: jsonOperator as any, value: jsonExpectedValue }
            : undefined,
        selectedIntegrations: selectedIntegrations.length > 0 ? selectedIntegrations : undefined,
        status: 'UNMONITORED',
        enabled: true,
        consecutiveFails: 0,
        consecutivePasses: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createMonitor(newMonitor);

      // Clear draft upon successful save
      try {
        localStorage.removeItem('pulse_monitor_draft_v1');
      } catch {}

      // Perform immediate test check
      globalScheduler.checkNow(newMonitor.id);

      toast('Monitor created successfully!', 'success');
      router.push(`/dashboard/monitors/${newMonitor.id}`);
    } catch (err: any) {
      toast(`Failed to create monitor: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/monitors"
            className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Add New Monitor</h1>
            <p className="text-xs text-text-secondary">
              Configure target endpoint, assertion rules, and notification integrations
            </p>
          </div>
        </div>
      </div>

      {/* Wizard Progress Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-border flex items-center justify-between">
        {[
          { num: 1, label: 'Basic' },
          { num: 2, label: 'Request' },
          { num: 3, label: 'Schedule' },
          { num: 4, label: 'Validation' },
          { num: 5, label: 'Alerts' },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <button
              onClick={() => setStep(s.num)}
              className="flex items-center gap-2 group text-left"
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-accent text-background shadow-md shadow-accent/25'
                    : step > s.num
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-surface-secondary text-text-muted border border-border'
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
              </div>
              <span
                className={`text-xs hidden sm:inline font-medium ${
                  step === s.num ? 'text-text-primary font-semibold' : 'text-text-muted'
                }`}
              >
                {s.label}
              </span>
            </button>
            {idx < 4 && <div className="flex-1 h-px bg-border mx-2 hidden sm:block" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-border">
        {/* Step 1: Basic */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Monitor Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { type: 'http', label: 'HTTP / Web', desc: 'Status code check' },
                  { type: 'keyword', label: 'Keyword', desc: 'String match assertion' },
                  { type: 'json', label: 'JSON / API', desc: 'Field path assertion' },
                  { type: 'ssl', label: 'SSL Certificate', desc: 'Expiry & validity' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setMonitorType(item.type as MonitorType)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      monitorType === item.type
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border bg-surface-secondary hover:border-text-secondary/30'
                    }`}
                  >
                    <div className="font-semibold text-xs text-text-primary">{item.label}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Friendly Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Production API Gateway"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Target URL <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="https://example.com/api/health"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Must be public HTTP/HTTPS. Internal addresses (127.0.0.1, 10.x, 192.168.x) are blocked by SSRF defense.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Primary customer-facing authentication service"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                placeholder="production, api, core"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Step 2: Request */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                HTTP Method
              </label>
              <div className="flex flex-wrap gap-2">
                {(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS'] as HttpMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      method === m
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Custom Headers (JSON or Key: Value per line)
              </label>
              <textarea
                rows={3}
                placeholder={`{\n  "Authorization": "Bearer token",\n  "X-Custom-Header": "value"\n}`}
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
              />
            </div>

            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Request Body
                </label>
                <textarea
                  rows={4}
                  placeholder={`{\n  "test": true\n}`}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="followRedirects"
                checked={followRedirects}
                onChange={(e) => setFollowRedirects(e.target.checked)}
                className="rounded border-border bg-surface-secondary text-accent focus:ring-accent"
              />
              <label htmlFor="followRedirects" className="text-xs text-text-primary cursor-pointer">
                Follow redirects (validated against SSRF on every hop)
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Monitoring Schedule & Thresholds */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Check Interval (Seconds)
                </label>
                <select
                  value={interval}
                  onChange={(e) => setIntervalVal(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every 1 minute (Recommended)</option>
                  <option value={120}>Every 2 minutes</option>
                  <option value={300}>Every 5 minutes</option>
                  <option value={600}>Every 10 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Request Timeout (Seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={timeout}
                  onChange={(e) => setTimeoutVal(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Failure Threshold (Consecutive fails to trigger Incident)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={failureThreshold}
                  onChange={(e) => setFailureThreshold(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Recovery Threshold (Consecutive passes to close Incident)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={recoveryThreshold}
                  onChange={(e) => setRecoveryThreshold(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Slow Response Threshold (ms)
                </label>
                <input
                  type="number"
                  min={100}
                  max={30000}
                  value={slowResponseThreshold}
                  onChange={(e) => setSlowResponseThreshold(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Marks status as DEGRADED if response exceeds this limit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Validation, Assertions & Pre-flight Test */}
        {step === 4 && (
          <div className="space-y-5">
            {monitorType === 'http' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Expected HTTP Status Codes
                </label>
                <input
                  type="text"
                  placeholder="200, 201, 204"
                  value={expectedStatusCodesStr}
                  onChange={(e) => setExpectedStatusCodesStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>
            )}

            {monitorType === 'keyword' && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-text-secondary">
                  Keyword Assertion
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={keywordOperator}
                    onChange={(e) => setKeywordOperator(e.target.value as any)}
                    className="px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="contains">Response contains</option>
                    <option value="not_contains">Response does not contain</option>
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. Welcome back"
                    value={keywordExpected}
                    onChange={(e) => setKeywordExpected(e.target.value)}
                    className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            {monitorType === 'json' && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-text-secondary">
                  Safe JSON Assertions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Path: data.status or items[0].id"
                    value={jsonPath}
                    onChange={(e) => setJsonPath(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                  <select
                    value={jsonOperator}
                    onChange={(e) => setJsonOperator(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="equals">equals</option>
                    <option value="not_equals">not equals</option>
                    <option value="contains">contains</option>
                    <option value="exists">exists</option>
                    <option value="not_exists">not exists</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Expected value: ok"
                    value={jsonExpectedValue}
                    onChange={(e) => setJsonExpectedValue(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            {/* Test Request Action */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-primary">
                  Pre-Flight Verification
                </span>
                <button
                  type="button"
                  onClick={handleRunPreFlightTest}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-medium text-accent hover:bg-surface-tertiary transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Destination'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono space-y-1 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {testResult.success ? '✓ Target verified successfully' : '✗ Verification failed'}
                  </div>
                  {testResult.details.status_code && (
                    <div>Status Code: {testResult.details.status_code}</div>
                  )}
                  {testResult.details.response_time_ms !== undefined && (
                    <div>Latency: {testResult.details.response_time_ms} ms</div>
                  )}
                  {testResult.details.assertion_message && (
                    <div>Assertion: {testResult.details.assertion_message}</div>
                  )}
                  {testResult.details.error && (
                    <div>Error: {testResult.details.error.message || JSON.stringify(testResult.details.error)}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Notifications */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Notification Integrations
              </label>
              {integrationsList.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-secondary border border-border text-xs text-text-muted">
                  No webhooks configured yet.{' '}
                  <Link href="/dashboard/notifications" className="text-accent underline">
                    Add Discord, Slack, or generic webhooks here
                  </Link>
                  .
                </div>
              ) : (
                <div className="space-y-2">
                  {integrationsList.map((intg) => {
                    const isChecked = selectedIntegrations.includes(intg.id);
                    return (
                      <label
                        key={intg.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-surface-secondary hover:border-text-secondary/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIntegrations((prev) => [...prev, intg.id]);
                              } else {
                                setSelectedIntegrations((prev) => prev.filter((id) => id !== intg.id));
                              }
                            }}
                            className="rounded border-border bg-surface text-accent focus:ring-accent"
                          />
                          <div>
                            <div className="font-semibold text-xs text-text-primary">{intg.name}</div>
                            <div className="text-[10px] uppercase font-mono text-text-muted">{intg.type}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border mt-6">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting || !url.trim()}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-accent text-background hover:bg-accent-hover transition-colors shadow-lg shadow-accent/25 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Saving...' : 'Save & Start Monitoring'}</span>
            </button>
          </div>

          {step < 5 && (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !url.trim()) {
                  toast('Please provide a target URL', 'error');
                  return;
                }
                setStep((s) => s + 1);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface-secondary text-text-primary hover:bg-surface-tertiary border border-border transition-colors w-full sm:w-auto justify-center"
            >
              <span>Advanced Options (Step {step + 1}/5)</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
