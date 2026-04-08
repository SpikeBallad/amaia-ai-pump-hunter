'use client';

import Image from 'next/image';

const services = [
  {
    eyebrow: 'Market Intelligence',
    title: 'Crypto market intelligence systems',
    body:
      'BALLAD TRADES LLC develops software designed to help traders identify structure, cross-exchange context, and hidden market behavior before broader reaction.',
  },
  {
    eyebrow: 'Trading Technology',
    title: 'Workflow-first trading systems',
    body:
      'The company builds tools intended to improve analytical clarity, operational process, and disciplined execution support for active market participants.',
  },
  {
    eyebrow: 'AI Tooling',
    title: 'AI-powered decision support',
    body:
      'Its product direction combines structured market analysis with AI-assisted workflows to reduce noise and support more informed trade review.',
  },
];

const products = [
  {
    name: 'AMAIA AI PUMP HUNTER PRO',
    status: 'Live',
    description:
      'A premium crypto intelligence platform built to identify cross-exchange accumulation, pre-move structure, and hidden market activity before broader reaction.',
    positioning: 'Intelligence-first product for traders who value structure, timing, and process.',
  },
  {
    name: 'DELIA AI QUANTUM BOT',
    status: 'Coming Soon',
    description:
      'An AI-driven trading system focused on automation, execution logic, and intelligent operational support for structured trading workflows.',
    positioning: 'Execution-focused product direction built for disciplined automation and decision support.',
  },
];

const trustSignals = [
  {
    title: 'Official business website',
    body: 'This site exists as the corporate web presence of BALLAD TRADES LLC and provides company, product, and contact information in a structured format.',
  },
  {
    title: 'Clear product positioning',
    body: 'The company presents its products as software and intelligence tools for traders, not as guaranteed-outcome financial offers.',
  },
  {
    title: 'Professional communication',
    body: 'Contact information, legal pages, product descriptions, and operating philosophy are displayed clearly to support trust and verification.',
  },
];

function NavLink({ href, label }) {
  return (
    <a
      href={href}
      className="rounded-full border border-amber-200/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-200 transition hover:border-amber-200/20 hover:bg-amber-200/[0.08] hover:text-amber-50"
    >
      {label}
    </a>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] uppercase tracking-[0.34em] text-amber-200/80">{children}</p>;
}

function TrustCard({ title, body }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-3 text-sm leading-7 text-stone-300">{body}</p>
    </div>
  );
}

function ServiceCard({ eyebrow, title, body }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
      <p className="text-[10px] uppercase tracking-[0.26em] text-amber-200/70">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-4 text-sm leading-8 text-stone-300">{body}</p>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white">{product.name}</p>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${
            product.status === 'Live'
              ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
              : 'border-amber-200/20 bg-amber-200/10 text-amber-100'
          }`}
        >
          {product.status}
        </span>
      </div>
      <p className="mt-5 text-sm leading-8 text-stone-300">{product.description}</p>
      <div className="mt-5 rounded-[24px] border border-amber-200/10 bg-amber-200/[0.05] p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Positioning</p>
        <p className="mt-2 text-sm font-medium text-white">{product.positioning}</p>
      </div>
    </div>
  );
}

function LegalTile({ href, title, body }) {
  return (
    <a
      href={href}
      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-amber-200/20 hover:bg-white/[0.06]"
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Legal</p>
      <p className="mt-2 text-lg font-semibold text-white">{title}</p>
      <p className="mt-3 text-sm leading-7 text-stone-300">{body}</p>
    </a>
  );
}

export default function CompanyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(217,176,96,0.12),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(251,191,36,0.08),transparent_20%),linear-gradient(180deg,#030507,#070b10_55%,#05070b)] px-4 py-6 text-stone-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <header className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-6 py-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-200/80">BALLAD TRADES LLC</p>
              <p className="mt-2 text-sm text-stone-400">
                Official business website · fintech products · market intelligence software
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <NavLink href="#home" label="Home" />
              <NavLink href="#services" label="Services" />
              <NavLink href="#about" label="About" />
              <NavLink href="#products" label="Products" />
              <NavLink href="#contact" label="Contact" />
              <NavLink href="#legal" label="Legal" />
            </nav>
          </div>
        </header>

        <section
          id="home"
          className="overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 sm:p-10 lg:p-12"
        >
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
            <div>
              <SectionLabel>Market intelligence. Built for precision.</SectionLabel>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                BALLAD TRADES LLC builds fintech tools for traders who operate with structure, discipline, and clarity.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-stone-300">
                BALLAD TRADES LLC is a fintech-focused company specializing in crypto market intelligence, trading systems,
                and AI-powered trader tools. Its products are designed to support workflow quality, market structure review,
                and professional decision support.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#products"
                  className="inline-flex items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/16"
                >
                  Explore Products
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-white/[0.08]"
                >
                  Contact BALLAD TRADES LLC
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-200">
                  Official company presence
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-200">
                  Software for traders
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-200">
                  No hype positioning
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[34px] border border-amber-200/15 bg-[linear-gradient(180deg,rgba(217,176,96,0.12),rgba(255,255,255,0.03))] p-6">
                <div className="mx-auto flex max-w-[360px] items-center justify-center">
                  <Image
                    src="/ballad-trades-logo.png"
                    alt="BALLAD TRADES LLC corporate logo"
                    width={720}
                    height={720}
                    className="h-auto w-full rounded-[28px] object-contain"
                    priority
                  />
                </div>
              </div>
              <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Company profile</p>
                <p className="mt-3 text-xl font-semibold text-white">Professional fintech business identity</p>
                <p className="mt-4 text-sm leading-8 text-stone-300">
                  This website is structured to present BALLAD TRADES LLC as a legitimate software business with clear
                  products, contact channels, and legal references appropriate for customers, partners, and payment
                  processor verification.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {trustSignals.map((signal) => (
            <TrustCard key={signal.title} title={signal.title} body={signal.body} />
          ))}
        </section>

        <section id="services" className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
          <SectionLabel>Services</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold text-white">What the company does</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-stone-300">
            BALLAD TRADES LLC develops fintech software and analytical systems for traders. The business focuses on
            intelligence, structure analysis, and decision-support tooling rather than marketing exaggerated financial outcomes.
          </p>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>
        </section>

        <section id="about" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
            <SectionLabel>About</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Built on more than 10 years of direct market experience.
            </h2>
            <p className="mt-5 text-sm leading-8 text-stone-300">
              BALLAD TRADES LLC was founded by a professional crypto trader with more than ten years of experience observing
              market structure, timing, workflow discipline, and execution logic. That experience shapes how the company
              designs products: with emphasis on process, clarity, and operational quality.
            </p>
            <p className="mt-4 text-sm leading-8 text-stone-300">
              The company does not position its products as guaranteed-outcome financial offers. Its role is to provide
              software, analytical context, and decision-support systems for traders who prefer disciplined tools over noise.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TrustCard
              title="Experience-led product design"
              body="Products are informed by practical market observation, not by flashy marketing language or unrealistic promises."
            />
            <TrustCard
              title="Precision over hype"
              body="The business voice is intentionally measured: software quality, clarity of use case, and professional trust matter more than spectacle."
            />
            <TrustCard
              title="Built for serious users"
              body="BALLAD TRADES LLC creates tools for traders who want structure review, operational support, and a more disciplined workflow."
            />
            <TrustCard
              title="Appropriate compliance tone"
              body="The website and product language avoid profit guarantees, exaggerated claims, and misleading financial promises."
            />
          </div>
        </section>

        <section id="products" className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
          <SectionLabel>Products</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold text-white">Current product lineup</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-stone-300">
            The company currently positions one live intelligence platform and one upcoming automation-focused product. Both
            are presented as software systems built to improve structure awareness, decision context, and workflow quality.
          </p>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {products.map((product) => (
              <ProductCard key={product.name} product={product} />
            ))}
          </div>
        </section>

        <section id="contact" className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
            <SectionLabel>Contact</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold text-white">Official business contact details</h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Business phone</p>
                <a href="tel:+34650358241" className="mt-2 block text-lg font-semibold text-white">
                  +34 650 358 241
                </a>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Business email</p>
                <a href="mailto:raphel23@live.com" className="mt-2 block text-lg font-semibold text-white">
                  raphel23@live.com
                </a>
              </div>
              <div className="rounded-[24px] border border-amber-200/15 bg-amber-200/[0.06] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Business note</p>
                <p className="mt-2 text-sm leading-7 text-stone-200">
                  For product, verification, or professional inquiries, please use the business email above. BALLAD TRADES LLC
                  uses this site as its official public company reference.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
            <SectionLabel>Inquiry</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold text-white">Professional inquiry form</h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-stone-300">
              This form is intended for professional communication regarding the company, its products, product access, or
              verification-related questions.
            </p>
            <form className="mt-6 grid gap-4">
              <input
                type="text"
                placeholder="Full name"
                className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500 focus:border-amber-200/30"
              />
              <input
                type="email"
                placeholder="Business email"
                className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500 focus:border-amber-200/30"
              />
              <textarea
                rows={5}
                placeholder="Please describe your inquiry"
                className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500 focus:border-amber-200/30"
              />
              <a
                href="mailto:raphel23@live.com?subject=BALLAD%20TRADES%20LLC%20Inquiry"
                className="inline-flex items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/16"
              >
                Send inquiry by email
              </a>
            </form>
          </div>
        </section>

        <section id="legal" className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
          <SectionLabel>Legal and trust</SectionLabel>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
            <div>
              <h2 className="mt-3 text-3xl font-semibold text-white">Structured for credibility and verification</h2>
              <p className="mt-4 text-sm leading-8 text-stone-300">
                BALLAD TRADES LLC presents this website as its official business website. The company builds software and
                intelligence products for traders. It does not position this website as a venue for unrealistic claims or
                guaranteed financial outcomes.
              </p>
              <p className="mt-4 text-sm leading-8 text-stone-300">
                The purpose of this structure is to provide clear business identity, product context, contact information,
                and legal visibility appropriate for customer trust and payment processor review.
              </p>
            </div>

            <div className="grid gap-4">
              <LegalTile
                href="/company/privacy"
                title="Privacy Policy"
                body="Placeholder legal page describing how BALLAD TRADES LLC may collect, store, and process data."
              />
              <LegalTile
                href="/company/terms"
                title="Terms of Service"
                body="Placeholder legal page outlining the terms governing use of company websites and products."
              />
            </div>

            <div className="rounded-[28px] border border-emerald-300/15 bg-emerald-300/[0.06] p-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/80">Business statement</p>
              <p className="mt-3 text-lg font-semibold text-white">Technology for serious market participants</p>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                BALLAD TRADES LLC develops software intended to support analysis and decision quality. Nothing on this site
                should be interpreted as a guarantee of performance or a promise of results.
              </p>
            </div>
          </div>
        </section>

        <footer className="rounded-[30px] border border-white/10 bg-white/[0.03] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200/80">BALLAD TRADES LLC</p>
              <p className="mt-2 text-sm text-stone-400">
                Market intelligence. Built for precision. Official company website for fintech software and trader tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-stone-300">
              <a href="mailto:raphel23@live.com" className="transition hover:text-white">
                raphel23@live.com
              </a>
              <a href="tel:+34650358241" className="transition hover:text-white">
                +34 650 358 241
              </a>
              <a href="/company/privacy" className="transition hover:text-white">
                Privacy Policy
              </a>
              <a href="/company/terms" className="transition hover:text-white">
                Terms of Service
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
