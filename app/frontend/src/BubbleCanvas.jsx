import { useRef, useEffect } from "react";

/**
 * BubbleCanvas renders animated bubbles sliding from right to left.
 * Each bubble represents a single API request to the backend.
 * The color indicates which version of the backend responded.
 *
 * Animation approach:
 * - Bubbles start at x=105% (off-screen right)
 * - Move left at a steady pace using requestAnimationFrame
 * - Get removed when they exit left or exceed their lifetime
 */
export default function BubbleCanvas({ bubbles, lifetimeMs }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const now = Date.now();

      bubbles.forEach((bubble) => {
        const age = now - bubble.createdAt;
        if (age > lifetimeMs) return;

        // Progress 0→1 over the bubble's lifetime
        const progress = age / lifetimeMs;

        // X moves from right (110%) to left (-10%)
        const x = w * (1.1 - progress * 1.2) * bubble.speed;

        // Y based on bubble's assigned position, with a gentle sine wave
        const baseY = (bubble.y / 100) * h;
        const y = baseY + Math.sin(progress * Math.PI * 2 + bubble.id) * 15;

        const radius = bubble.size / 2;

        // Fade in at start, fade out at end
        let alpha = 1;
        if (progress < 0.05) alpha = progress / 0.05;
        if (progress > 0.85) alpha = (1 - progress) / 0.15;
        alpha = Math.max(0, Math.min(1, alpha));

        // Skip if off screen
        if (x + radius < 0 || x - radius > w) return;

        // Draw the bubble glow
        const glow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 1.5);
        glow.addColorStop(0, `${bubble.color}${Math.round(alpha * 0.3 * 255).toString(16).padStart(2, "0")}`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw the bubble body
        const grad = ctx.createRadialGradient(
          x - radius * 0.3,
          y - radius * 0.3,
          radius * 0.1,
          x,
          y,
          radius
        );
        grad.addColorStop(0, lightenColor(bubble.color, 40));
        grad.addColorStop(0.7, bubble.color);
        grad.addColorStop(1, darkenColor(bubble.color, 30));

        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight / shine
        ctx.fillStyle = `rgba(255, 255, 255, ${0.25 * alpha})`;
        ctx.beginPath();
        ctx.ellipse(
          x - radius * 0.25,
          y - radius * 0.25,
          radius * 0.35,
          radius * 0.2,
          -Math.PI / 4,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Version label
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `bold ${Math.max(10, radius * 0.55)}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`v${bubble.version}`, x, y);

        ctx.globalAlpha = 1;
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [bubbles, lifetimeMs]);

  return <canvas ref={canvasRef} className="bubble-canvas" />;
}

/** Lighten a hex color by a percentage */
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
  return `rgb(${r},${g},${b})`;
}

/** Darken a hex color by a percentage */
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
  return `rgb(${r},${g},${b})`;
}
