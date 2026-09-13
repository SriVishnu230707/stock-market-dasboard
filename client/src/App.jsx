import React, { useEffect, useState } from "react";
import { api, loadSession, clearSession } from "./api.js";
import { connectSocket, disconnectSocket } from "./socket.js";
import Layout from "./components/Layout.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import StockDetail from "./pages/StockDetail.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import Alerts from "./pages/Alerts.jsx";
import Portfolio from "./pages/Portfolio.jsx";
import MarketNews from "./components/MarketNews.jsx";
import { playAlertChime } from "./utils/audio.js";
import { styles, COLORS } from "./styles.js";

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [connected, setConnected] = useState(false);
  const [marketStatus, setMarketStatus] = useState({
    provider: "yahoo",
    source: "yahoo-rest",
    configured: true,
    usingFallback: false,
  });
  const [tab, setTab] = useState("dashboard");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [toast, setToast] = useState(null);

  const soundEnabledRef = React.useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // ---- Socket lifecycle: connect once per session -------------------------
  useEffect(() => {
    if (!session) return;
    const socket = connectSocket(session.token);

    if (socket.connected) {
      setConnected(true);
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMarketStatus = (status) => setMarketStatus(status);
    const onTick = (snapshot) => {
      setStocks(snapshot);
      setConnected(true);
    };
    const onAlert = (payload) => {
      setToast(payload);
      if (soundEnabledRef.current) {
        playAlertChime();
      }
      setTimeout(() => setToast(null), 7000);
      api
        .getAlerts()
        .then(setAlerts)
        .catch(() => {});
    };

    socket.on("connect", onConnect);
    socket.on("reconnect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);
    socket.on("reconnect_failed", onDisconnect);
    socket.on("market-status", onMarketStatus);
    socket.on("tick", onTick);
    socket.on("alert-triggered", onAlert);

    return () => {
      socket.off("connect", onConnect);
      socket.off("reconnect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
      socket.off("reconnect_failed", onDisconnect);
      socket.off("market-status", onMarketStatus);
      socket.off("tick", onTick);
      socket.off("alert-triggered", onAlert);
    };
  }, [session?.token]);

  // ---- Initial data load once authenticated --------------------------------
  useEffect(() => {
    if (!session) return;
    api
      .getWatchlist()
      .then(setWatchlist)
      .catch((err) => {
        if (err?.message?.includes("401") || err?.message?.includes("token")) {
          handleLogout();
        }
      });
    api
      .getAlerts()
      .then(setAlerts)
      .catch(() => {});
    api
      .getPortfolio()
      .then(setPortfolio)
      .catch(() => {});
  }, [session]);

  function handleAuthed(result) {
    setSession(result);
  }

  function handleLogout() {
    clearSession();
    disconnectSocket();
    setSession(null);
    setStocks([]);
    setWatchlist([]);
    setAlerts([]);
    setPortfolio(null);
    setConnected(false);
  }

  function openStock(symbol) {
    setSelectedSymbol(symbol);
    setTab("stock");
  }

  async function toggleWatch(symbol) {
    if (watchlist.includes(symbol)) {
      const next = await api.removeFromWatchlist(symbol);
      setWatchlist(next);
    } else {
      const next = await api.addToWatchlist(symbol);
      setWatchlist(next);
    }
  }

  async function createAlert(payload) {
    const alert = await api.createAlert(payload);
    setAlerts((prev) => [alert, ...prev]);
  }

  async function deleteAlert(id) {
    await api.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  }

  async function buy(payload) {
    const p = await api.buy(payload);
    setPortfolio(p);
  }

  async function sell(payload) {
    const p = await api.sell(payload);
    setPortfolio(p);
  }

  if (!session) return <Auth onAuthed={handleAuthed} />;

  const selectedStock = stocks.find((s) => s.symbol === selectedSymbol);
  const activeAlertCount = alerts.filter((a) => a.status === "active").length;

  return (
    <Layout
      tab={tab}
      setTab={setTab}
      alertBadge={activeAlertCount}
      connected={connected}
      marketStatus={marketStatus}
      user={session.user}
      stocks={stocks}
      onOpenStock={openStock}
      soundEnabled={soundEnabled}
      onToggleSound={() => setSoundEnabled((s) => !s)}
      onLogout={handleLogout}
    >
      {toast && (
        <div
          style={{
            ...styles.toast,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderLeft: `4px solid ${COLORS.amber}`,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                color: COLORS.amber,
                fontSize: 11.5,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 2,
              }}
            >
              🔔 Price Alert Triggered
            </div>
            <div>
              <strong>{toast.symbol}</strong> crossed {toast.direction} ₹{toast.target} — now ₹
              {toast.price.toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "none",
              border: "none",
              color: COLORS.textMuted,
              cursor: "pointer",
              fontSize: 15,
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {tab === "dashboard" && (
        <div>
          <Dashboard stocks={stocks} onOpen={openStock} />
          <MarketNews onOpenStock={openStock} />
        </div>
      )}
      {tab === "stock" && (
        <StockDetail
          stock={selectedStock}
          inWatch={watchlist.includes(selectedSymbol)}
          onToggleWatch={toggleWatch}
        />
      )}
      {tab === "watchlist" && (
        <Watchlist
          watchlist={watchlist}
          stocks={stocks}
          onOpen={openStock}
          onAdd={toggleWatch}
          onRemove={toggleWatch}
        />
      )}
      {tab === "alerts" && (
        <Alerts alerts={alerts} stocks={stocks} onCreate={createAlert} onDelete={deleteAlert} />
      )}
      {tab === "portfolio" && (
        <Portfolio portfolio={portfolio} stocks={stocks} onBuy={buy} onSell={sell} />
      )}
      {tab === "news" && <MarketNews onOpenStock={openStock} />}
    </Layout>
  );
}
