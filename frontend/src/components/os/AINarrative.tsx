import { ReactNode } from 'react'
import { useTypedText } from '@/hooks/useTypedText'

interface Props {
  eyebrow?: string
  title: string
  narrative: string
  typewrite?: boolean
  meta?: ReactNode
  children?: ReactNode
}

export function AINarrative({
  eyebrow = 'AI executive brief',
  title,
  narrative,
  typewrite = true,
  meta,
  children,
}: Props) {
  const { text, done } = useTypedText(narrative, typewrite)

  return (
    <section className="panel overflow-hidden">
      <div className="px-6 pt-6 pb-5 border-b border-ink-100 dark:border-white/8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps text-intel mb-2">{eyebrow}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
              {title}
            </h1>
          </div>
          {meta}
        </div>
      </div>
      <div className="px-6 py-6">
        <p className="text-base md:text-lg leading-relaxed text-ink-800 dark:text-gray-200 max-w-3xl min-h-[3.5rem]">
          {text}
          {!done && <span className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-intel animate-pulseDot" />}
        </p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  )
}
