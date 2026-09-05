/** Dashboard windows use the same UTC dates as the analytics API. */
export function getAnalyticsDateWindow(range: string, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const end = now.toISOString().slice(0, 10);
  let start: Date;

  switch (range) {
    case "24h":
      start = new Date(Date.UTC(year, month, day));
      break;
    case "7d":
      start = new Date(Date.UTC(year, month, day - 6));
      break;
    case "3m":
      start = new Date(Date.UTC(year, month, day - 89));
      break;
    case "12m":
      start = new Date(Date.UTC(year, month, day - 364));
      break;
    case "mtd":
      start = new Date(Date.UTC(year, month, 1));
      break;
    case "qtd":
      start = new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1));
      break;
    case "ytd":
      start = new Date(Date.UTC(year, 0, 1));
      break;
    case "all":
      start = new Date(Date.UTC(2020, 0, 1));
      break;
    default:
      start = new Date(Date.UTC(year, month, day - 29));
  }

  return { start: start.toISOString().slice(0, 10), end };
}
