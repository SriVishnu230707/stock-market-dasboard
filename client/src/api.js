const BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),

  getStocks: () => request("/stocks"),
  getStockChart: (symbol, range = "1d") =>
    request(`/stocks/${encodeURIComponent(symbol)}/chart?range=${range}`),

  getWatchlist: () => request("/watchlist"),
  addToWatchlist: (symbol) => request(`/watchlist/${symbol}`, { method: "POST" }),
  removeFromWatchlist: (symbol) => request(`/watchlist/${symbol}`, { method: "DELETE" }),

  getAlerts: () => request("/alerts"),
  createAlert: (payload) => request("/alerts", { method: "POST", body: payload }),
  deleteAlert: (id) => request(`/alerts/${id}`, { method: "DELETE" }),

  getPortfolio: () => request("/portfolio"),
  buy: (payload) => request("/portfolio/buy", { method: "POST", body: payload }),
  sell: (payload) => request("/portfolio/sell", { method: "POST", body: payload }),
};

export function saveSession({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function loadSession() {
  const token = getToken();
  const userRaw = localStorage.getItem("user");
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}
