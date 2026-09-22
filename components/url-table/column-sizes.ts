export const urlTableColumnSize = {
  actions: 40,
  clicks: 60,
  createdAt: 60,
  separator: 60,
  shortUrl: 180,
  status: 60,
} as const;

// Below this width the table scrolls sideways instead of squeezing columns
// until badges and links overlap.
export const urlTableStyle = {
  tableLayout: "fixed",
  width: "100%",
  minWidth: 720,
} as const;
