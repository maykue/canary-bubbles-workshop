import { useState, useEffect, useRef, useCallback } from "react";
import BubbleCanvas from "./BubbleCanvas";

const POLL_INTERVAL_MS = 600; // How often we ask the backend for its version
const MAX_BUBBLES = 80; // Max visible bubbles on screen
const BUBBLE_LIFETIME_MS = 12000; // How long a bubble lives before removal

export default function App() {
  const [bubbles, setBubbles] = useState([]);
  const [versionStats, setVersionStats] = useState({});
  const [error, setError] = useState(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const bubbleIdRef = useRef(0);

  // Poll the backend for version info and create bubbles
  const fetchVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setError(null);

      const id = bubbleIdRef.current++;
      const newBubble = {
        id,
        version: data.version,
        color: data.color,
        pod: data.pod,
        createdAt: Date.now(),
        // Random vertical position and size for visual variety
        y: Math.random() * 80 + 10, // 10-90% from top
        size: Math.random() * 25 + 35, // 35-60px diameter
        speed: Math.random() * 0.3 + 0.7, // speed multiplier
      };

      setBubbles((prev) => {
        const now = Date.now();
        // Remove expired bubbles and cap at MAX_BUBBLES
        const active = prev
          .filter((b) => now - b.createdAt < BUBBLE_LIFETIME_MS)
          .slice(-(MAX_BUBBLES - 1));
        return [...active, newBubble];
      });

      setTotalRequests((prev) => prev + 1);

      // Update version statistics
      setVersionStats((prev) => ({
        ...prev,
        [data.version]: {
          color: data.color,
          count: (prev[data.version]?.count || 0) + 1,
        },
      }));
    } catch (err) {
      setError(`Cannot reach backend: ${err.message}`);
    }
  }, []);

  // Start polling
  useEffect(() => {
    fetchVersion(); // Initial fetch
    const interval = setInterval(fetchVersion, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchVersion]);

  // Calculate traffic percentages for the bar
  const recentWindow = 30; // Look at last N requests for traffic split
  const recentBubbles = bubbles.slice(-recentWindow);
  const recentByVersion = {};
  recentBubbles.forEach((b) => {
    recentByVersion[b.version] = recentByVersion[b.version] || {
      color: b.color,
      count: 0,
    };
    recentByVersion[b.version].count++;
  });

  const trafficSegments = Object.entries(recentByVersion).map(
    ([version, { color, count }]) => ({
      version,
      color,
      percentage: recentBubbles.length
        ? ((count / recentBubbles.length) * 100).toFixed(0)
        : 0,
    })
  );

  return (
    <div className="app-container">
      <header className="header">
        <h1>Canary Bubbles</h1>
        <p>
          Each bubble is a request to the backend. Colors show which version
          responded. Watch the canary rollout in real time.
        </p>
      </header>

      <BubbleCanvas bubbles={bubbles} lifetimeMs={BUBBLE_LIFETIME_MS} />

      {error && <div className="error-banner">{error}</div>}

      <div className="stats-panel">
        {/* Version legend */}
        <div className="version-legend">
          {Object.entries(versionStats).map(([version, { color, count }]) => (
            <div key={version} className="version-item">
              <span className="version-dot" style={{ background: color }} />
              <span className="version-label">v{version}</span>
              <span className="version-count">({count})</span>
            </div>
          ))}
        </div>

        {/* Traffic split bar */}
        <div className="traffic-bar-container">
          <div className="traffic-bar-label">
            Live traffic split (last {recentWindow} requests)
          </div>
          <div className="traffic-bar">
            {trafficSegments.map((seg) => (
              <div
                key={seg.version}
                className="traffic-segment"
                style={{
                  width: `${seg.percentage}%`,
                  background: seg.color,
                }}
                title={`v${seg.version}: ${seg.percentage}%`}
              />
            ))}
          </div>
        </div>

        {/* Request count */}
        <div className="status-info">
          <div className="total">{totalRequests}</div>
          total requests
        </div>
      </div>
    </div>
  );
}
