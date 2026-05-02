
export async function detectLocalCurrency(): Promise<{ code: string; symbol: string }> {
  try {
    // Priority 1: Check timezone for India
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') {
      return { code: 'INR', symbol: '₹' };
    }

    // Priority 2: Browser Locale
    const locale = window.navigator.language;
    const browserCurrency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).resolvedOptions().currency;
    
    // If locale is India-based but currency isn't detected yet
    if (locale.includes('IN')) {
      return { code: 'INR', symbol: '₹' };
    }

    if (browserCurrency && browserCurrency !== 'USD') {
      return { code: browserCurrency, symbol: getSymbol(browserCurrency) };
    }

    return { code: 'USD', symbol: '$' };
  } catch (e) {
    return { code: 'USD', symbol: '$' };
  }
}

function getSymbol(code: string): string {
  try {
    // Use 'en-IN' for INR to ensure we get the ₹ symbol properly if in India context
    const locale = code === 'INR' ? 'en-IN' : undefined;
    return (0).toLocaleString(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).replace(/\d/g, '').trim();
  } catch (e) {
    return code === 'INR' ? '₹' : '$';
  }
}
