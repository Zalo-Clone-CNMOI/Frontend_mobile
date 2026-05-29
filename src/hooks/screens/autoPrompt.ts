/**
 * Decide whether a catch-up `autoPrompt` route param should be auto-sent into
 * the Zai conversation (Issue #5). Returns the text to send, or `null` to skip.
 *
 * The chat screen passes the last value it already sent as `alreadySent` so the
 * same prompt is not re-sent across re-renders / effect re-runs. A *different*
 * prompt (e.g. navigating to another catch-up) is allowed through.
 */
export function pickAutoPromptToSend(
  autoPrompt: string | undefined,
  alreadySent: string | null,
): string | null {
  const trimmed = (autoPrompt ?? '').trim();
  if (!trimmed) return null;
  if (trimmed === alreadySent) return null;
  return trimmed;
}
