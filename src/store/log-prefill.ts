// Simple store to pass prefill data from dashboard task cards to the log screen.
// Not React state — just a plain object that gets read once and cleared.

interface LogPrefill {
  domainId: string;
  sessionType: string;
}

let pendingPrefill: LogPrefill | null = null;

export function setLogPrefill(data: LogPrefill) {
  pendingPrefill = data;
}

export function consumeLogPrefill(): LogPrefill | null {
  const data = pendingPrefill;
  pendingPrefill = null;
  return data;
}
