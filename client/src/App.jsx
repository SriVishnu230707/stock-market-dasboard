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
import { styles } from "./styles.js";

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [toast, setToast] = useState(null);

  // ---- Socket lifecycle: connect once per session -------------------------
  useEffect(() => {
    if (!session) return;
    const socket = connectSocket(session.token);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("tick", (snapshot) => setStocks(snapshot));
    socket.on("alert-triggered", (payload) => {
      setToast(payload);
      setTimeout(() => setToast(null), 6000);
      api
        .getAlerts()
        .then(setAlerts)
        .catch(() => {});
    });

    return () => disconnectSocket();
  }, [session]);

  // ---- Initial data load once authenticated --------------------------------
  useEffect(() => {
    if (!session) return;
    api
      .getWatchlist()
      .then(setWatchlist)
      .catch(() => {});
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
      user={session.user}
      onLogout={handleLogout}
    >
      {toast && (
        <div style={styles.toast}>
          <strong>{toast.symbol}</strong> crossed {toast.direction} ₹{toast.target} — now ₹
          {toast.price.toFixed(2)}
        </div>
      )}

      {tab === "dashboard" && <Dashboard stocks={stocks} onOpen={openStock} />}
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
    </Layout>
  );
}
