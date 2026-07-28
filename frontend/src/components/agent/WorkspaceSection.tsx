import { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function WorkspaceSection({ title, description, action, children }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900 dark:text-white">{title}</h2>
          {description && <p className="text-xs text-ink-500 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
