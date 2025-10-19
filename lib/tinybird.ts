type TBParams = Record<string, string | number | boolean | undefined>;

function buildQuery(params: TBParams): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    usp.append(k, String(v));
  }
  return usp.toString();
}

export async function tinybirdFetch<T>(
  pipeName: string,
  params: TBParams,
): Promise<T> {
  const host = process.env.TINYBIRD_API_URL;
  const token = process.env.TINYBIRD_TOKEN;
  if (!token) {
    throw new Error("Missing TINYBIRD_TOKEN env");
  }

  const qs = buildQuery({ ...params, token });

  const url = `${host}/v0/pipes/${pipeName}.json?${qs}`;
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tinybird error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json as T;
}
