/**
 * Format a number as Indian currency: ₹1,68,500
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to readable: "28 Apr 2026"
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Relative time: "2 hrs ago", "3 days ago"
 */
export function timeAgo(dateStr: string | Date): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(dateStr);
}

/**
 * Get initials from name: "Amit Kumar" → "AK"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

/**
 * Tenure string: "5 yrs 3 mths"
 */
export function getTenure(dateOfJoining: string | null | undefined): string {
  if (!dateOfJoining) return '—';
  const joined = new Date(dateOfJoining);
  const now = new Date();
  let months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth());
  const years = Math.floor(months / 12);
  months = months % 12;
  if (years === 0) return `${months} mth${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} yr${years !== 1 ? 's' : ''}`;
  return `${years} yr${years !== 1 ? 's' : ''} ${months} mth${months !== 1 ? 's' : ''}`;
}

/**
 * Mask sensitive data: "1234 •••• ••••"
 */
export function maskSensitive(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 4) + ' ' + '•'.repeat(Math.max(0, value.length - 4));
}