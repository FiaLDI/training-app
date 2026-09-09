import type { NewsSection } from '@/entities/news/model/types'

type Props = {
  sections: NewsSection[]
}

export function NewsArticleBody({ sections }: Props) {
  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <section
          key={`${section.heading}-${index}`}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--foreground)]">
            {section.heading}
          </h2>
          {section.type === 'paragraphs' ? (
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
