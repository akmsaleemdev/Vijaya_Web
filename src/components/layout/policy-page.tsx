import { PageHero } from "@/components/layout/page-hero";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Reveal } from "@/components/motion/reveal";

/** Shared shell for policy/legal pages. */
export function PolicyPage({
  eyebrow,
  title,
  intro,
  image,
  crumb,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  crumb: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <main className="pb-24">
      <PageHero eyebrow={eyebrow} title={title} intro={intro} image={image} height="mid" />
      <section className="py-14 md:py-20">
        <div className="container-editorial max-w-3xl">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: crumb }]} />
          <Reveal>
            <p className="text-[12px] uppercase tracking-[0.18em] text-stone">Last reviewed: {updated}</p>
          </Reveal>
          <div className="mt-10 space-y-12">
            {sections.map((s, i) => (
              <Reveal key={s.heading} delay={Math.min(i * 0.04, 0.2)}>
                <h2 className="text-lg font-medium">{s.heading}</h2>
                <div className="mt-4 space-y-4">
                  {s.body.map((p, j) => (
                    <p key={j} className="text-[14px] font-light leading-8 text-stone">{p}</p>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-14 card-editorial p-6">
            <p className="text-[12px] leading-6 text-stone">
              Policy note: the final commercial terms are being confirmed by VICC management. Where a clause above
              depends on that confirmation it is marked provisional and will be updated before production launch.
            </p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
