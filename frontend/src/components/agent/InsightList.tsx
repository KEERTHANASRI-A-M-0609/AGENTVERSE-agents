interface Item {
  id: string
  title: string
  detail?: string
}

interface Props {
  title: string
  items: Item[]
  emptyMessage?: string
  variant?: 'default' | 'opportunity' | 'risk'
}

export function InsightList({
  title,
  items,
  emptyMessage = 'Nothing flagged right now.',
  variant = 'default',
}: Props) {
  const accent =
    variant === 'opportunity'
      ? 'border-l-emerald-500'
      : variant === 'risk'
        ? 'border-l-rose-500'
        : 'border-l-ink-300 dark:border-l-white/20'

  return (
    <div className="panel p-5 h-full">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink-500">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`pl-3 border-l-2 ${accent}`}
            >
              <p className="text-sm font-medium text-ink-900 dark:text-white">{item.title}</p>
              {item.detail && (
                <p className="text-sm text-ink-500 mt-0.5 leading-relaxed">{item.detail}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
