interface Action {
  id: string
  label: string
  onClick: () => void
  primary?: boolean
  disabled?: boolean
}

interface Props {
  actions: Action[]
}

export function QuickActions({ actions }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={a.disabled}
          onClick={a.onClick}
          className={`text-xs font-medium px-3 py-2 rounded-lg border disabled:opacity-50 ${
            a.primary
              ? 'bg-ink-900 text-white border-ink-900 dark:bg-white dark:text-ink-900 dark:border-white'
              : 'bg-white dark:bg-transparent border-ink-100 dark:border-white/10 text-ink-700 dark:text-gray-300 hover:bg-ink-50 dark:hover:bg-white/5'
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
