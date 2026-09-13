// CSV export utilities for Watchlist and Portfolio

function triggerDownload(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportWatchlistCsv(watchlistRows) {
  if (!watchlistRows || !watchlistRows.length) return;

  const headers = ["Symbol", "Company Name", "Sector", "Current Price (INR)", "Change (%)", "Prev Close (INR)", "Exported At"];
  const now = new Date().toISOString();

  const lines = watchlistRows.map((s) => [
    `"${s.symbol}"`,
    `"${(s.name || "").replace(/"/g, '""')}"`,
    `"${s.sector || ""}"`,
    s.price.toFixed(2),
    s.change.toFixed(2),
    s.prevClose.toFixed(2),
    `"${now}"`,
  ]);

  const csv = [headers.join(","), ...lines.map((l) => l.join(","))].join("\r\n");
  const filename = `tickerroom-watchlist-${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csv, filename);
}

export function exportPortfolioCsv(portfolio, liveHoldings) {
  if (!portfolio) return;

  const headers = [
    "Symbol",
    "Quantity",
    "Avg Buy Price (INR)",
    "Current Price (INR)",
    "Total Invested (INR)",
    "Current Value (INR)",
    "P&L (INR)",
    "Return (%)",
    "Exported At",
  ];
  const now = new Date().toISOString();

  const lines = (liveHoldings || []).map((h) => [
    `"${h.symbol}"`,
    h.qty,
    h.avgPrice.toFixed(2),
    h.price.toFixed(2),
    h.invested.toFixed(2),
    h.current.toFixed(2),
    h.pl.toFixed(2),
    h.plPct.toFixed(2),
    `"${now}"`,
  ]);

  // Append cash balance and summary row
  lines.push([]);
  lines.push([`"AVAILABLE CASH"`, `"${portfolio.cash.toFixed(2)}"`, `""`, `""`, `""`, `""`, `""`, `""`, `"${now}"`]);

  const csv = [headers.join(","), ...lines.map((l) => l.join(","))].join("\r\n");
  const filename = `tickerroom-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csv, filename);
}
