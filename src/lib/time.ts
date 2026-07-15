export const OPEN_HOUR = 9
export const CLOSE_HOUR = 22
export const MAX_SLOTS = 6

export const TIME_SLOTS = Array.from(
  { length: (CLOSE_HOUR - OPEN_HOUR) * 2 },
  (_, index) => {
    const minutes = OPEN_HOUR * 60 + index * 30
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  },
)

export function addMinutes(time: string, amount: number): string {
  const [hour, minute] = time.split(':').map(Number)
  const total = hour * 60 + minute + amount
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isPastSlot(dateKey: string, time: string, now = new Date()): boolean {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute).getTime() < now.getTime()
}

export function formatLongDate(dateKey: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(`${dateKey}T12:00:00`))
}
