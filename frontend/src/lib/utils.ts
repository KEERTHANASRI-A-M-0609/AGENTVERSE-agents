import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function getUrgencyColor(urgency: string): string {
  return { high: 'text-red-600', medium: 'text-amber-600', low: 'text-emerald-600' }[urgency] ?? 'text-gray-500'
}

export function getUrgencyBg(urgency: string): string {
  return {
    high: 'bg-rose-50 border-rose-200',
    medium: 'bg-amber-50 border-amber-200',
    low: 'bg-teal-50 border-teal-200',
  }[urgency] ?? 'bg-gray-50'
}

export function getTrendIcon(trend: string): string {
  return { upward: '↑', downward: '↓', seasonal_spike: '⚡', stable: '→' }[trend] ?? '→'
}

export function getTrendColor(trend: string): string {
  return { upward: 'text-emerald-600', downward: 'text-red-500', seasonal_spike: 'text-amber-600', stable: 'text-gray-500' }[trend] ?? 'text-gray-500'
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}
