/**
 * Compare a caller-supplied value with the expected one in time that depends
 * only on the supplied value's length, so response timing reveals neither how
 * much of the expected value matched nor how long it is.
 */
export function constantTimeEqual(provided: string, expected: string): boolean {
  if (expected.length === 0) return provided.length === 0;

  let diff = provided.length ^ expected.length;
  for (let i = 0; i < provided.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i % expected.length);
  }
  return diff === 0;
}

/** True only when the secret is configured and the caller supplied exactly it. */
export function matchesSecret(
  provided: string,
  expected: string | undefined,
): boolean {
  return !!expected && constantTimeEqual(provided, expected);
}
