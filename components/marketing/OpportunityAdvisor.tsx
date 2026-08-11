'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Headphones,
  MessageCircleQuestion,
  SendHorizontal,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { readAttribution } from '@/components/marketing/AttributionCapture';
import { trackEvent, type AdvisorIntent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { dailyByteLinks } from '@/lib/dailybyte';
import { answerQuestion, type AnswerResult, type KnowledgeCta } from '@/lib/content/knowledge';
import { EnsaarLiveSupport } from '@/components/marketing/EnsaarLiveSupport';

type AdvisorStage = 'choose' | 'ask' | 'questions' | 'result' | 'form' | 'support' | 'success';
type AnswerMap = Record<string, string>;

type Question = {
  id: string;
  prompt: string;
  options: Array<{ label: string; value: string }>;
};

const PATHS: Record<
  AdvisorIntent,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: typeof Building2;
    questions: Question[];
  }
> = {
  enterprise: {
    label: 'Use AI in my organization',
    shortLabel: 'Enterprise',
    description: 'Build practical AI capability across your teams.',
    icon: Building2,
    questions: [
      {
        id: 'stage',
        prompt: 'Where is AI adoption today?',
        options: [
          { label: 'Exploring where AI can create value', value: 'exploring' },
          { label: 'People are using AI individually', value: 'experiments' },
          { label: 'We have a pilot or prototype', value: 'pilot' },
          { label: 'We need to scale with control', value: 'scaling' },
        ],
      },
      {
        id: 'priority',
        prompt: 'Where would evidence matter most?',
        options: [
          { label: 'Software delivery and engineering', value: 'engineering' },
          { label: 'Knowledge search and decision support', value: 'knowledge' },
          { label: 'Operations, service, or automation', value: 'operations' },
          { label: 'Security, governance, and cost', value: 'governance' },
        ],
      },
    ],
  },
  individual: {
    label: 'Build my practical AI capability',
    shortLabel: 'Individual',
    description: 'Practice on work that looks like your role.',
    icon: UserRound,
    questions: [
      {
        id: 'profile',
        prompt: 'Which best describes you?',
        options: [
          { label: 'Student or recent graduate', value: 'student' },
          { label: 'Software engineer', value: 'engineer' },
          { label: 'Data, product, QA, or operations professional', value: 'professional' },
          { label: 'Career switcher', value: 'career-switcher' },
        ],
      },
      {
        id: 'goal',
        prompt: 'What do you want to prove?',
        options: [
          { label: 'I can direct AI on real work', value: 'direct-ai' },
          { label: 'I can verify AI output reliably', value: 'verify-ai' },
          { label: 'I can build software with AI', value: 'build-with-ai' },
          { label: 'I am ready for an AI-shaped role', value: 'career-ready' },
        ],
      },
    ],
  },
  institution: {
    label: 'Upskill a team or campus',
    shortLabel: 'Cohort',
    description: 'Measure capability before scaling a program.',
    icon: GraduationCap,
    questions: [
      {
        id: 'audience',
        prompt: 'Who needs AI capability?',
        options: [
          { label: 'College students', value: 'college-students' },
          { label: 'Engineering teams', value: 'engineering-team' },
          { label: 'Business and operations teams', value: 'business-team' },
          { label: 'Leaders and managers', value: 'leadership' },
        ],
      },
      {
        id: 'cohort',
        prompt: 'How many people should a first pilot include?',
        options: [
          { label: 'Up to 25 people', value: '1-25' },
          { label: '26 to 100 people', value: '26-100' },
          { label: '101 to 500 people', value: '101-500' },
          { label: 'More than 500 people', value: '500+' },
        ],
      },
    ],
  },
};

// Where a signup-style CTA points. Enterprises and cohorts go to enterprise
// signup; individuals to individual signup. The contact form is a fallback, not
// the default destination.
const CTA_LINK: Record<'individual' | 'enterprise' | 'pricing', string> = {
  individual: dailyByteLinks.individual,
  enterprise: dailyByteLinks.enterprise,
  pricing: dailyByteLinks.pricing,
};

const CTA_LABEL: Record<'individual' | 'enterprise' | 'pricing', string> = {
  individual: 'Start individual signup',
  enterprise: 'Start enterprise signup',
  pricing: 'See DailyByte plans',
};

function getRecommendation(intent: AdvisorIntent, answers: AnswerMap) {
  if (intent === 'individual') {
    return {
      title: 'DailyByte AI Learn and AI Jobs',
      description:
        'Start with AI Learn for guided practice, add a role in AI Jobs from a job description, and use Daily Code to keep core skills aligned to the role.',
      workType: 'DailyByte individual registration',
    };
  }

  if (intent === 'institution') {
    return {
      title: 'DailyByte Enterprise Enablement',
      description:
        'Create a team workspace or cohort rollout around AI Learn, AI Jobs, Daily Code paths, and measurable practical AI capability.',
      workType: 'Tailored DailyByte team or campus rollout',
    };
  }

  if (answers.stage === 'pilot' || answers.stage === 'scaling') {
    return {
      title: 'Controlled AI Adoption Sprint',
      description:
        'Review the current pilot, define quality and control evidence, and turn it into an operable adoption plan.',
      workType: 'Controlled enterprise AI adoption sprint',
    };
  }

  return {
    title: 'AI Workflow Diagnostic',
    description:
      'Bring one process. We will map the value hypothesis, data and control questions, and a practical pilot boundary.',
    workType: 'Enterprise AI workflow diagnostic',
  };
}

function EnaiMark({ className }: { className?: string }) {
  return (
    <Image src="/enai-logo.svg" alt="EnAI" width={28} height={28} unoptimized className={className} />
  );
}

export function OpportunityAdvisor({ liveSupportEnabled = false }: { liveSupportEnabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [dailyByteInView, setDailyByteInView] = useState(false);
  const [intent, setIntent] = useState<AdvisorIntent | null>(null);
  const [stage, setStage] = useState<AdvisorStage>('choose');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const [question, setQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [askResult, setAskResult] = useState<AnswerResult | null>(null);

  const startPath = useCallback((nextIntent: AdvisorIntent) => {
    setIntent(nextIntent);
    setAnswers({});
    setQuestionIndex(0);
    setStage('questions');
    trackEvent('advisor_path_selected', { intent: nextIntent });
  }, []);

  const runQuestion = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const result = answerQuestion(trimmed);
    setLastQuestion(trimmed);
    setAskResult(result);
    setQuestion('');
    setStage('ask');
    trackEvent('enai_question_asked', {
      resolved: result.kind,
      matched: result.kind === 'answer' ? result.entry.id : undefined,
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!window.sessionStorage.getItem('ensaar-advisor-nudge-dismissed')) {
        setShowNudge(true);
      }
    }, 3500);

    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ intent?: AdvisorIntent; source?: string }>).detail;
      setOpen(true);
      setShowNudge(false);
      if (detail?.intent) startPath(detail.intent);
      else setStage('choose');
      trackEvent('advisor_opened', { intent: detail?.intent, source: detail?.source });
    };

    const handleNavigation = (event: Event) => {
      const nextOpen = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open);
      setNavigationOpen(nextOpen);
      if (nextOpen) setShowNudge(false);
    };

    window.addEventListener('ensaar:open-advisor', handleOpen);
    window.addEventListener('ensaar:navigation-state', handleNavigation);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('ensaar:open-advisor', handleOpen);
      window.removeEventListener('ensaar:navigation-state', handleNavigation);
    };
  }, [startPath]);

  useEffect(() => {
    const dailyByte = document.getElementById('dailybyte');
    if (!dailyByte) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setDailyByteInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.25 },
    );

    observer.observe(dailyByte);
    return () => observer.disconnect();
  }, []);

  const recommendation = useMemo(
    () => (intent ? getRecommendation(intent, answers) : null),
    [answers, intent],
  );

  function closeAdvisor() {
    setOpen(false);
    trackEvent('advisor_closed', { stage, intent: intent || undefined });
  }

  function dismissNudge() {
    setShowNudge(false);
    window.sessionStorage.setItem('ensaar-advisor-nudge-dismissed', 'true');
  }

  function answerQuestionStep(id: string, value: string) {
    if (!intent) return;
    const nextAnswers = { ...answers, [id]: value };
    setAnswers(nextAnswers);
    const isLast = questionIndex === PATHS[intent].questions.length - 1;
    if (isLast) {
      setStage('result');
      trackEvent('advisor_recommendation_viewed', { intent, recommendation: getRecommendation(intent, nextAnswers).title });
    } else {
      setQuestionIndex((current) => current + 1);
    }
  }

  function startContactForm(source: string) {
    setStage('form');
    trackEvent('advisor_contact_started', { intent: intent || undefined, source });
  }

  function goBack() {
    if (stage === 'support') {
      setStage('choose');
      return;
    }
    if (stage === 'ask') {
      setStage('choose');
      return;
    }
    if (stage === 'form') {
      setStage(intent && recommendation ? 'result' : 'choose');
      return;
    }
    if (stage === 'result') {
      setQuestionIndex(PATHS[intent!].questions.length - 1);
      setStage('questions');
      return;
    }
    if (stage === 'questions' && questionIndex > 0) {
      setQuestionIndex((current) => current - 1);
      return;
    }
    setIntent(null);
    setStage('choose');
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (!data.name?.trim() || !/^\S+@\S+\.\S+$/.test(data.email || '')) {
      setStatus('error');
      setMessage('Please add your name and a valid email.');
      return;
    }

    setStatus('sending');
    setMessage('');

    // The form can be reached from a guided path (with an intent and
    // recommendation) or from a general EnAI question. Build the lead payload for
    // whichever route the person took.
    const guidedAnswerText = intent
      ? PATHS[intent].questions
          .map((q) => {
            const selected = q.options.find((option) => option.value === answers[q.id]);
            return `${q.prompt} ${selected?.label || 'Not answered'}`;
          })
          .join('\n')
      : '';
    const workType = recommendation?.workType || 'General enquiry from EnAI';
    const audience = intent ? PATHS[intent].label : 'General question via EnAI';
    const detailLines = [
      recommendation ? `Recommended starting point: ${recommendation.title}` : 'Reached via an EnAI question',
      lastQuestion ? `Question asked: ${lastQuestion}` : '',
      guidedAnswerText,
      `Additional context: ${data.context || 'Not provided'}`,
    ].filter(Boolean);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          website: data.website,
          workType,
          audience,
          adoptionStage: answers.stage,
          leadSource: intent ? 'guided-advisor' : 'enai-question',
          timeline: 'Requested advisor follow-up',
          details: detailLines.join('\n'),
          sourcePath: window.location.pathname,
          ...readAttribution(),
        }),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to save your request.');
      setReference(result.id?.slice(0, 8).toUpperCase() || 'RECEIVED');
      setStage('success');
      setStatus('idle');
      trackEvent('advisor_lead_submitted', {
        intent: intent || undefined,
        recommendation: recommendation?.title,
      });
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save your request.');
    }
  }

  const activeQuestion = intent ? PATHS[intent].questions[questionIndex] : null;

  return (
    <>
      <AnimatePresence>
        {showNudge && !open && !navigationOpen && !dailyByteInView && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-24 right-4 z-[79] w-[min(330px,calc(100vw-2rem))] border border-[#0c2343]/15 bg-white p-4 text-[#0c2343] shadow-2xl sm:right-6"
          >
            <button type="button" onClick={dismissNudge} aria-label="Dismiss" className="absolute right-2 top-2 p-1 text-slate-500 hover:text-[#0c2343]">
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex gap-3 pr-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#0c2343]/10">
                <EnaiMark className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold">Questions about Ensaar or DailyByte?</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">Ask EnAI, or get matched to the right starting point for your role.</p>
                <button
                  type="button"
                  onClick={() => { setOpen(true); setShowNudge(false); setStage('choose'); trackEvent('advisor_opened', { source: 'nudge' }); }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#007da8]"
                >
                  Ask EnAI <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!navigationOpen && !dailyByteInView && (
        <button
          type="button"
          onClick={() => { setOpen(true); setShowNudge(false); setStage('choose'); trackEvent('advisor_opened', { source: 'floating-button' }); }}
          className="fixed bottom-5 right-4 z-[78] inline-flex h-14 items-center gap-2 rounded-full bg-[#0c2343] px-4 pr-5 font-semibold text-white shadow-[0_12px_35px_rgba(12,35,67,0.34)] transition hover:-translate-y-1 hover:bg-[#12345f] sm:right-6"
          aria-label="Open EnAI"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
            <EnaiMark className="h-6 w-6" />
          </span>
          <span className="hidden sm:inline">Ask EnAI</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close EnAI"
              className="fixed inset-0 z-[80] cursor-default bg-[#061326]/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAdvisor}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="EnAI assistant"
              initial={{ opacity: 0, y: 24, x: 12 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 16, x: 8 }}
              transition={{ type: 'spring', stiffness: 330, damping: 30 }}
              className="fixed inset-x-3 bottom-3 z-[81] flex max-h-[min(760px,calc(100svh-1.5rem))] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#081a31] text-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[430px]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                    <EnaiMark className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">EnAI</div>
                    <div className="text-[0.6875rem] text-slate-400">Ask about Ensaar and DailyByte, or find your start</div>
                  </div>
                </div>
                <button type="button" onClick={closeAdvisor} aria-label="Close" className="rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-6 sm:px-6">
                {stage !== 'choose' && stage !== 'success' && (
                  <button type="button" onClick={goBack} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white">
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back
                  </button>
                )}

                {stage === 'choose' && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#59d8c8]">Ask EnAI</p>
                    <h2 className="mt-3 text-2xl leading-tight">What would you like to know?</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">Ask a question about Ensaar or DailyByte, or choose a goal and EnAI will route you to the right signup.</p>

                    <form
                      onSubmit={(event) => { event.preventDefault(); runQuestion(question); }}
                      className="mt-5"
                    >
                      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 focus-within:border-[#59d8c8]">
                        <MessageCircleQuestion className="h-4 w-4 shrink-0 text-[#59d8c8]" aria-hidden />
                        <input
                          value={question}
                          onChange={(event) => setQuestion(event.target.value)}
                          placeholder="e.g. What is AI Jobs? How do I sign up?"
                          aria-label="Ask EnAI a question"
                          maxLength={300}
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        />
                        <button type="submit" aria-label="Ask" disabled={!question.trim()} className="rounded-md p-1.5 text-[#0c2343] transition disabled:opacity-40 enabled:bg-[#59d8c8] enabled:hover:bg-[#6fe6d7]">
                          <SendHorizontal className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </form>

                    {liveSupportEnabled && (
                      <button type="button" onClick={() => { setStage('support'); trackEvent('advisor_contact_started', { source: 'live-support' }); }} className="mt-4 flex w-full items-center gap-4 rounded-lg border border-[#59d8c8]/45 bg-[#59d8c8]/[0.08] p-4 text-left transition hover:bg-[#59d8c8]/[0.14]">
                        <Headphones className="h-5 w-5 shrink-0 text-[#59d8c8]" aria-hidden />
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Chat with our team</span><span className="mt-1 block text-xs leading-relaxed text-slate-400">Start a live conversation and return here for replies.</span></span>
                        <ArrowRight className="h-4 w-4 text-[#59d8c8]" aria-hidden />
                      </button>
                    )}

                    <p className="mt-7 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Or start with a goal</p>
                    <div className="mt-3 space-y-2.5">
                      {(Object.keys(PATHS) as AdvisorIntent[]).map((pathId) => {
                        const path = PATHS[pathId];
                        const Icon = path.icon;
                        return (
                          <button key={pathId} type="button" onClick={() => startPath(pathId)} className="group flex w-full items-center gap-4 rounded-lg border border-white/12 bg-white/[0.04] p-4 text-left transition hover:border-[#59d8c8]/50 hover:bg-[#59d8c8]/[0.08]">
                            <Icon className="h-5 w-5 shrink-0 text-[#59d8c8]" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">{path.label}</span>
                              <span className="mt-1 block text-xs leading-relaxed text-slate-400">{path.description}</span>
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-[#59d8c8]" aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {stage === 'ask' && (
                  <AskAnswer
                    result={askResult}
                    lastQuestion={lastQuestion}
                    value={question}
                    onChange={setQuestion}
                    onAsk={() => runQuestion(question)}
                    onContact={() => startContactForm('enai-answer')}
                    onPickIntent={(nextIntent) => startPath(nextIntent)}
                  />
                )}

                {liveSupportEnabled && stage === 'support' && <EnsaarLiveSupport />}

                {stage === 'questions' && intent && activeQuestion && (
                  <div>
                    <div className="flex items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[#59d8c8]">
                      <span>{PATHS[intent].shortLabel} path</span>
                      <span>{questionIndex + 1} / {PATHS[intent].questions.length}</span>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-[#59d8c8] transition-all" style={{ width: `${((questionIndex + 1) / PATHS[intent].questions.length) * 100}%` }} />
                    </div>
                    <h2 className="mt-6 text-2xl leading-tight">{activeQuestion.prompt}</h2>
                    <div className="mt-6 space-y-2.5">
                      {activeQuestion.options.map((option) => (
                        <button key={option.value} type="button" onClick={() => answerQuestionStep(activeQuestion.id, option.value)} className={cn('flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left text-sm transition', answers[activeQuestion.id] === option.value ? 'border-[#59d8c8] bg-[#59d8c8]/10' : 'border-white/12 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]')}>
                          {option.label}
                          <ArrowRight className="h-4 w-4 shrink-0 text-[#59d8c8]" aria-hidden />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {stage === 'result' && recommendation && intent && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#59d8c8]">Recommended starting point</p>
                    <h2 className="mt-3 text-3xl leading-tight">{recommendation.title}</h2>
                    <p className="mt-4 text-sm leading-relaxed text-slate-300">{recommendation.description}</p>
                    <div className="mt-6 border-y border-white/12 py-5">
                      <p className="text-xs font-semibold text-white">{intent === 'enterprise' ? 'What enterprise signup sets up' : 'What happens next'}</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-300">
                        {intent === 'individual' ? (
                          <>
                            <ResultLine>Create your DailyByte account</ResultLine>
                            <ResultLine>Start AI Learn with guided practice</ResultLine>
                            <ResultLine>Add a role in AI Jobs from a job description</ResultLine>
                          </>
                        ) : intent === 'institution' ? (
                          <>
                            <ResultLine>Create a team workspace</ResultLine>
                            <ResultLine>Invite a cohort around target roles</ResultLine>
                            <ResultLine>Track AI Learn, AI Jobs, and Daily Code readiness</ResultLine>
                          </>
                        ) : (
                          <>
                            <ResultLine>Create an enterprise workspace for your teams</ResultLine>
                            <ResultLine>Roll out AI Learn, AI Jobs, and Daily Code</ResultLine>
                            <ResultLine>Track practical AI capability with reporting</ResultLine>
                          </>
                        )}
                      </ul>
                    </div>
                    {intent === 'individual' ? (
                      <a href={dailyByteLinks.individual} target="_blank" rel="noreferrer" onClick={() => trackEvent('dailybyte_registration_clicked', { source: 'advisor-result' })} className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 py-3.5 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]">
                        Start individual signup <ArrowRight className="h-4 w-4" aria-hidden />
                      </a>
                    ) : (
                      <>
                        <a href={dailyByteLinks.enterprise} target="_blank" rel="noreferrer" onClick={() => trackEvent('dailybyte_registration_clicked', { source: intent === 'institution' ? 'advisor-team-result' : 'advisor-enterprise-result' })} className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 py-3.5 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]">
                          Start enterprise signup <ArrowRight className="h-4 w-4" aria-hidden />
                        </a>
                        <button type="button" onClick={() => startContactForm('advisor-result')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                          Or talk to our team <ArrowRight className="h-4 w-4" aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {stage === 'form' && (
                  <form onSubmit={submitLead} noValidate>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#59d8c8]">Talk to our team</p>
                    <h2 className="mt-3 text-2xl leading-tight">Where should we reach you?</h2>
                    <div className="mt-6 grid gap-4">
                      <AdvisorField name="name" label="Name" autoComplete="name" required />
                      <AdvisorField name="email" label="Work email" type="email" autoComplete="email" required />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <AdvisorField name="company" label="Company or college" autoComplete="organization" />
                        <AdvisorField name="phone" label="Phone or WhatsApp" type="tel" autoComplete="tel" />
                      </div>
                      <label className="grid gap-2 text-xs font-semibold text-slate-300">
                        Anything we should know?
                        <textarea name="context" rows={3} defaultValue={lastQuestion ? `My question: ${lastQuestion}` : ''} className="resize-y rounded-md border border-white/15 bg-white/[0.06] px-3.5 py-3 text-sm font-normal text-white outline-none placeholder:text-slate-500 focus:border-[#59d8c8]" placeholder="Optional context" />
                      </label>
                      <div className="hidden" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
                    </div>
                    <p className="mt-4 text-[0.6875rem] leading-relaxed text-slate-400">We use your details only to respond to this request. See our <Link href="/legal/privacy" className="underline hover:text-white">privacy notice</Link>.</p>
                    <button type="submit" disabled={status === 'sending'} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 py-3.5 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e] disabled:opacity-60">
                      {status === 'sending' ? 'Saving your request...' : 'Send my request'}
                      {status !== 'sending' && <ArrowRight className="h-4 w-4" aria-hidden />}
                    </button>
                    <p role="status" aria-live="polite" className={cn('mt-3 min-h-5 text-center text-xs', status === 'error' && 'text-rose-300')}>{message}</p>
                  </form>
                )}

                {stage === 'success' && (
                  <div className="py-5 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#59d8c8]/15 text-[#59d8c8]">
                      <Check className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#59d8c8]">Request {reference}</p>
                    <h2 className="mt-3 text-2xl">Your request is in our workspace.</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">An Ensaar team member will review it and respond within one business day.</p>
                    <button type="button" onClick={closeAdvisor} className="mt-6 rounded-md border border-white/20 px-5 py-3 text-sm font-semibold transition hover:bg-white/10">Continue exploring</button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function AskAnswer({
  result,
  lastQuestion,
  value,
  onChange,
  onAsk,
  onContact,
  onPickIntent,
}: {
  result: AnswerResult | null;
  lastQuestion: string;
  value: string;
  onChange: (value: string) => void;
  onAsk: () => void;
  onContact: () => void;
  onPickIntent: (intent: AdvisorIntent) => void;
}) {
  const cta: KnowledgeCta = result?.kind === 'answer' ? result.entry.cta ?? null : null;

  return (
    <div>
      {lastQuestion && (
        <div className="mb-4 rounded-lg bg-white/[0.06] px-4 py-3 text-sm text-slate-200">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-slate-500">You asked</span>
          <p className="mt-1">{lastQuestion}</p>
        </div>
      )}

      {result?.kind === 'answer' && (
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#59d8c8]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> EnAI
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">{result.entry.answer}</p>
          <div className="mt-5 space-y-2.5">
            {cta === 'contact' ? (
              <button type="button" onClick={onContact} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 py-3 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]">
                Talk to our team <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : cta ? (
              <a
                href={CTA_LINK[cta]}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent('dailybyte_registration_clicked', { source: `enai-answer-${cta}` })}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 py-3 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]"
              >
                {CTA_LABEL[cta]} <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      )}

      {result?.kind === 'profanity' && (
        <div>
          <p className="text-sm leading-relaxed text-slate-200">Let us keep this professional. Please rephrase your question and EnAI will help.</p>
        </div>
      )}

      {(result?.kind === 'unknown' || result?.kind === 'empty') && (
        <div>
          <p className="text-sm leading-relaxed text-slate-200">
            EnAI answers only with information it can verify about Ensaar and DailyByte, so it does not guess. It does not have a confident answer to that one. Our team can help you directly.
          </p>
          <button type="button" onClick={onContact} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#f5a623] px-5 py-3 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]">
            Ask our team <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onPickIntent('individual')} className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">I am an individual</button>
            <button type="button" onClick={() => onPickIntent('enterprise')} className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">I represent an organization</button>
          </div>
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); onAsk(); }} className="mt-7">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Ask another question</p>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 focus-within:border-[#59d8c8]">
          <MessageCircleQuestion className="h-4 w-4 shrink-0 text-[#59d8c8]" aria-hidden />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Ask about Ensaar or DailyByte"
            aria-label="Ask EnAI another question"
            maxLength={300}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button type="submit" aria-label="Ask" disabled={!value.trim()} className="rounded-md p-1.5 text-[#0c2343] transition disabled:opacity-40 enabled:bg-[#59d8c8] enabled:hover:bg-[#6fe6d7]">
            <SendHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

function ResultLine({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#59d8c8]" aria-hidden />{children}</li>;
}

function AdvisorField({ name, label, type = 'text', autoComplete, required }: { name: string; label: string; type?: string; autoComplete?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-xs font-semibold text-slate-300">
      {label}{required && <span className="sr-only"> required</span>}
      <input name={name} type={type} autoComplete={autoComplete} required={required} className="rounded-md border border-white/15 bg-white/[0.06] px-3.5 py-3 text-sm font-normal text-white outline-none focus:border-[#59d8c8]" />
    </label>
  );
}
