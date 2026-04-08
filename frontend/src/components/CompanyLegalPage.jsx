import Image from 'next/image';

export default function CompanyLegalPage({ title, body, kind }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(217,176,96,0.12),transparent_24%),linear-gradient(180deg,#030507,#070b10_55%,#05070b)] px-4 py-6 text-stone-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-[30px] border border-amber-200/15 bg-amber-200/[0.05] p-5">
              <Image
                src="/ballad-trades-logo.png"
                alt="BALLAD TRADES LLC logo"
                width={640}
                height={640}
                className="h-auto w-full rounded-[24px] object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-amber-200/80">BALLAD TRADES LLC</p>
              <h1 className="mt-4 text-4xl font-semibold text-white">{title}</h1>
              <p className="mt-5 text-sm leading-8 text-stone-300">{body}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Business</p>
              <p className="mt-2 text-base font-semibold text-white">BALLAD TRADES LLC</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">
                This legal placeholder supports professional identity, legal clarity, and payment processor verification.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Document type</p>
              <p className="mt-2 text-base font-semibold text-white">{kind}</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">
                Replace this placeholder with company-approved final legal copy when ready for production compliance.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Business email</p>
              <a href="mailto:raphel23@live.com" className="mt-2 block text-base font-semibold text-white">
                raphel23@live.com
              </a>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Business phone</p>
              <a href="tel:+34650358241" className="mt-2 block text-base font-semibold text-white">
                +34 650 358 241
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/company"
              className="inline-flex items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/16"
            >
              Back to company site
            </a>
            <a
              href="mailto:raphel23@live.com?subject=BALLAD%20TRADES%20LLC%20Legal%20Inquiry"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-white/[0.08]"
            >
              Contact business
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
