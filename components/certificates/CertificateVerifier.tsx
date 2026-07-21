'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  FileCheck2,
  LoaderCircle,
  Mail,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { CertificateSearchResult, VerifiedCertificate } from '@/lib/certificates';
import { cn } from '@/lib/utils';

type Step = 'search' | 'email' | 'otp' | 'verified';
type ApiError = { error?: string; attemptsRemaining?: number };

const STATUS_STYLE = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  expired: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  revoked: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
} as const;

export function CertificateVerifier({ initialCertificateNumber = '' }: { initialCertificateNumber?: string }) {
  const [certificateNumber, setCertificateNumber] = useState(initialCertificateNumber.toUpperCase());
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('search');
  const [searchResult, setSearchResult] = useState<CertificateSearchResult | null>(null);
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const initialSearchStarted = useRef(false);

  const search = useCallback(async (candidate?: string) => {
    const normalized = (candidate ?? certificateNumber).trim().toUpperCase();
    if (!normalized) {
      setMessage('Enter the certificate number printed on the credential.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/certificate-verification/search?certificateNumber=${encodeURIComponent(normalized)}`, { cache: 'no-store' });
      const data = (await response.json()) as CertificateSearchResult & ApiError;
      if (!response.ok) throw new Error(data.error || 'Certificate not found.');
      setCertificateNumber(data.certificateNumber);
      setSearchResult(data);
      setStep('email');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Certificate not found.');
    } finally {
      setLoading(false);
    }
  }, [certificateNumber]);

  useEffect(() => {
    if (!initialCertificateNumber || initialSearchStarted.current) return;
    initialSearchStarted.current = true;
    void search(initialCertificateNumber);
  }, [initialCertificateNumber, search]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search();
  }

  async function post(action: 'request-otp' | 'verify-otp' | 'resend-otp') {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/certificate-verification/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateNumber, email, ...(action === 'verify-otp' ? { otp } : {}) }),
      });
      const data = (await response.json()) as ApiError & { certificate?: VerifiedCertificate };
      if (!response.ok) {
        if (typeof data.attemptsRemaining === 'number') setAttemptsRemaining(data.attemptsRemaining);
        throw new Error(data.error || 'Unable to complete verification.');
      }

      if (action === 'verify-otp' && data.certificate) {
        setCertificate(data.certificate);
        setStep('verified');
      } else {
        setStep('otp');
        setAttemptsRemaining(3);
        setMessage(action === 'resend-otp' ? 'A new code was sent to your email.' : 'Check your email for a 6-digit code.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to complete verification.');
    } finally {
      setLoading(false);
    }
  }

  async function scanQr(file: File) {
    setScanning(true);
    setMessage('');
    try {
      const { default: QrScanner } = await import('qr-scanner');
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const raw = typeof result === 'string' ? result : result.data;
      let candidate = raw.trim();
      try {
        const url = new URL(candidate);
        candidate = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
      } catch {
        candidate = candidate.split('/').filter(Boolean).pop() || candidate;
      }
      if (!candidate) throw new Error('The QR code does not contain a certificate number.');
      setCertificateNumber(candidate.toUpperCase());
      await search(candidate);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The QR code could not be read. Try a clearer image or enter the number manually.');
    } finally {
      setScanning(false);
    }
  }

  function reset() {
    setStep('search');
    setCertificateNumber('');
    setEmail('');
    setOtp('');
    setSearchResult(null);
    setCertificate(null);
    setAttemptsRemaining(3);
    setMessage('');
  }

  return (
    <div className="border border-line-subtle bg-bg-primary text-ink-primary shadow-[0_28px_80px_rgba(7,26,52,0.16)]">
      <div className="flex items-center justify-between border-b border-line-subtle bg-bg-secondary/70 px-5 py-4 md:px-7">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <div className="text-sm font-semibold text-ink-primary">Official Ensaar validation</div>
            <div className="text-xs text-ink-muted">BCEP and Ensaar-issued credentials</div>
          </div>
        </div>
        <span className="hidden items-center gap-2 font-mono text-[0.6875rem] uppercase text-ink-muted sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live registry
        </span>
      </div>

      <div className="p-5 md:p-8">
        {step === 'search' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4">
              <FileCheck2 className="mt-1 h-7 w-7 shrink-0 text-accent-secondary" aria-hidden />
              <div>
                <h2 className="text-2xl leading-tight">Verify a certificate</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Enter the certificate number or upload a clear image of its QR code.</p>
              </div>
            </div>
            <form className="mt-8" onSubmit={submitSearch}>
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary" htmlFor="certificate-number">Certificate number</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="certificate-number"
                  value={certificateNumber}
                  onChange={(event) => setCertificateNumber(event.target.value.toUpperCase())}
                  placeholder="ENSAAR-YYYY-XXXXX-XXXXXXXX"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-md border border-line-subtle bg-bg-secondary px-4 py-3.5 font-mono text-sm uppercase text-ink-primary outline-none transition focus:border-accent-primary"
                />
                <button disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#0c2343] px-5 text-sm font-semibold text-white transition hover:bg-[#12345f] disabled:opacity-60">
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
                  Search
                </button>
              </div>
            </form>
            <div className="my-6 flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-muted"><span className="h-px flex-1 bg-line-subtle" />or<span className="h-px flex-1 bg-line-subtle" /></div>
            <label className="group flex cursor-pointer items-center justify-between gap-4 rounded-md border border-dashed border-accent-primary/40 bg-accent-primary/[0.04] p-4 transition hover:border-accent-primary hover:bg-accent-primary/[0.07]">
              <span className="flex items-center gap-3 text-sm font-semibold text-ink-primary"><QrCode className="h-5 w-5 text-accent-primary" aria-hidden />{scanning ? 'Reading QR code...' : 'Upload QR code image'}</span>
              {scanning ? <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" aria-hidden /> : <Upload className="h-4 w-4 text-accent-primary" aria-hidden />}
              <input type="file" accept="image/*" className="sr-only" disabled={scanning} onChange={(event) => { const file = event.target.files?.[0]; if (file) void scanQr(file); event.currentTarget.value = ''; }} />
            </label>
          </motion.div>
        )}

        {step === 'email' && searchResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => { setStep('search'); setMessage(''); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"><ArrowLeft className="h-3.5 w-3.5" aria-hidden />Back</button>
            <div className="mt-6 border-l-4 border-emerald-500 bg-emerald-500/[0.06] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">Certificate found</div><div className="mt-2 font-mono text-sm text-ink-primary">{searchResult.certificateNumber}</div></div>
                <Status status={searchResult.status} />
              </div>
              <div className="mt-4 text-lg font-semibold text-ink-primary">{searchResult.recipientName}</div>
            </div>
            <div className="mt-7 flex items-start gap-4"><Mail className="mt-1 h-6 w-6 text-accent-secondary" aria-hidden /><div><h2 className="text-2xl leading-tight">Receive a validation code</h2><p className="mt-2 text-sm leading-relaxed text-ink-secondary">Use your email address. We send the full validated record only after OTP confirmation.</p></div></div>
            <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void post('request-otp'); }}>
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary" htmlFor="verifier-email">Your email address</label>
              <input id="verifier-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="mt-2 w-full rounded-md border border-line-subtle bg-bg-secondary px-4 py-3.5 text-sm text-ink-primary outline-none transition focus:border-accent-primary" />
              <button disabled={loading || !email.includes('@')} className="mt-4 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e] disabled:opacity-60">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}Send verification code</button>
            </form>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => { setStep('email'); setMessage(''); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"><ArrowLeft className="h-3.5 w-3.5" aria-hidden />Change email</button>
            <div className="mt-7 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary"><ShieldCheck className="h-6 w-6" aria-hidden /></span>
              <h2 className="mt-5 text-2xl">Enter the 6-digit code</h2>
              <p className="mt-2 text-sm text-ink-secondary">Sent to <strong className="text-ink-primary">{email}</strong></p>
            </div>
            <form className="mt-7" onSubmit={(event) => { event.preventDefault(); void post('verify-otp'); }}>
              <label className="sr-only" htmlFor="verification-code">Verification code</label>
              <input id="verification-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="w-full rounded-md border border-line-subtle bg-bg-secondary px-4 py-4 text-center font-mono text-3xl tracking-[0.3em] text-ink-primary outline-none transition focus:border-accent-primary" />
              {attemptsRemaining < 3 && <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-300">{attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining</p>}
              <button disabled={loading || otp.length !== 6} className="mt-4 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-md bg-[#0c2343] px-5 font-semibold text-white transition hover:bg-[#12345f] disabled:opacity-60">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />}Validate certificate</button>
            </form>
            <button type="button" disabled={loading} onClick={() => void post('resend-otp')} className="mx-auto mt-4 flex items-center gap-2 text-xs font-semibold text-accent-primary hover:text-accent-secondary"><RefreshCw className="h-3.5 w-3.5" aria-hidden />Send a new code</button>
          </motion.div>
        )}

        {step === 'verified' && certificate && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center">
              <motion.span initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"><Check className="h-7 w-7" aria-hidden /></motion.span>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">Registry match confirmed</div>
              <h2 className="mt-2 text-3xl">Certificate validated</h2>
              <p className="mt-2 text-sm text-ink-secondary">This record was returned by Ensaar's official certificate registry.</p>
            </div>
            <div className="mt-8 border-y border-line-subtle">
              <CertificateField label="Certificate number" value={certificate.certificateNumber} mono />
              <CertificateField label="Recipient" value={certificate.recipientName} />
              <CertificateField label="Program or purpose" value={certificate.purpose} />
              {certificate.description && <CertificateField label="Description" value={certificate.description} />}
              <CertificateField label="Issue date" value={formatDate(certificate.issueDate)} icon={<CalendarDays className="h-4 w-4" aria-hidden />} />
              <CertificateField label="Validity" value={certificate.isLifetime ? 'Lifetime credential' : `${formatDate(certificate.validFrom)} to ${formatDate(certificate.validUntil)}`} />
              <CertificateField label="Issued by" value={[certificate.issuerName, certificate.issuerDesignation].filter(Boolean).join(', ')} />
              <CertificateField label="Organization" value={certificate.organizationName} />
              <div className="flex items-center justify-between gap-4 py-4"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Current status</span><Status status={certificate.status} /></div>
            </div>
            {certificate.certificateImage && (
              <div className="mt-6 overflow-hidden border border-line-subtle bg-bg-secondary p-2">
                <Image src={certificate.certificateImage} alt={`Certificate issued to ${certificate.recipientName}`} width={1400} height={990} className="h-auto w-full" />
              </div>
            )}
            <button type="button" onClick={reset} className="mt-6 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]"><RefreshCw className="h-4 w-4" aria-hidden />Verify another certificate</button>
          </motion.div>
        )}

        <p role="status" aria-live="polite" className={cn('mt-5 min-h-5 text-center text-xs leading-relaxed', message && (message.toLowerCase().includes('sent') || message.toLowerCase().includes('check your email')) ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300')}>{message}</p>
      </div>

      <div className="border-t border-line-subtle bg-bg-secondary/50 px-5 py-4 text-center text-xs leading-relaxed text-ink-muted md:px-7">
        Need help with a credential? <Link href="mailto:info@ensaar.com" className="font-semibold text-ink-primary hover:text-accent-primary">Contact the BCEP team</Link>.
      </div>
    </div>
  );
}

function Status({ status }: { status: 'active' | 'expired' | 'revoked' }) {
  return <span className={cn('inline-flex rounded-full border px-3 py-1 font-mono text-[0.6875rem] font-semibold uppercase', STATUS_STYLE[status])}>{status}</span>;
}

function CertificateField({ label, value, mono = false, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return <div className="grid gap-1 border-b border-line-subtle py-4 last:border-b-0 sm:grid-cols-[145px_1fr] sm:gap-5"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</span><span className={cn('flex items-start gap-2 text-sm font-semibold leading-relaxed text-ink-primary', mono && 'font-mono')}>{icon}{value}</span></div>;
}

function formatDate(value?: string) {
  if (!value) return 'Not specified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
