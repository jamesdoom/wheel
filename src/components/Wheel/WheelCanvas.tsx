// src\components\Wheel\WheelCanvas.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { WheelItem, WheelMode } from "../../types";
import {
  FULL_CIRCLE,
  getClockwiseRotationDelta,
  getSelectableItems,
  getTargetRotationForSegment,
  getWeightedSegments,
  pickWeightedWinner,
} from "../../utils/wheel";
import "./WheelCanvas.css";
import ResultModal from "./ResultModal";

type WheelCanvasProps = {
  items: WheelItem[];
  setItems: React.Dispatch<React.SetStateAction<WheelItem[]>>;
  mode: WheelMode;
  createDefaultItems: () => WheelItem[];
  isMuted: boolean;
  theme: "light" | "dark";
};

const CANVAS_SIZE = 460;
const WHEEL_CENTER = 212;
const WHEEL_RADIUS = 178;
const HUB_RADIUS = 52;
const MAX_DEVICE_PIXEL_RATIO = 2;

function hexToRgb(hexColor: string) {
  const normalizedColor = hexColor.replace("#", "");
  const colorValue = Number.parseInt(normalizedColor, 16);

  if (normalizedColor.length !== 6 || Number.isNaN(colorValue)) {
    return { r: 96, g: 165, b: 250 };
  }

  return {
    r: (colorValue >> 16) & 255,
    g: (colorValue >> 8) & 255,
    b: colorValue & 255,
  };
}

function mixColor(hexColor: string, target: "black" | "white", amount: number) {
  const { r, g, b } = hexToRgb(hexColor);
  const targetValue = target === "white" ? 255 : 0;
  const mix = (channel: number) =>
    Math.round(channel + (targetValue - channel) * amount);

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function getTextColor(hexColor: string) {
  const { r, g, b } = hexToRgb(hexColor);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.58 ? "#111827" : "#f9fafb";
}

function truncateTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  const ellipsis = "...";
  let truncatedText = text;

  while (
    truncatedText.length > 0 &&
    ctx.measureText(`${truncatedText}${ellipsis}`).width > maxWidth
  ) {
    truncatedText = truncatedText.slice(0, -1);
  }

  return truncatedText ? `${truncatedText}${ellipsis}` : ellipsis;
}

function WheelCanvas({
  items,
  setItems,
  mode,
  createDefaultItems,
  isMuted,
  theme,
}: WheelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const rotationRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<WheelItem | null>(null);

  useEffect(() => {
    const audio = new Audio("/sounds/win.mp3");
    audio.preload = "auto";
    audio.volume = 0.5;
    winAudioRef.current = audio;
  }, []);

  useEffect(() => {
    const audio = new Audio("/sounds/tick.wav");
    audio.preload = "auto";
    audio.volume = 0.35;

    tickAudioRef.current = audio;
  }, []);

  const visibleItems = items.filter((item) => !item.hidden);

  const selectableItems = getSelectableItems(items);

  const canSpin = selectableItems.length > 1;

  const drawWheel = useCallback(
    (rotationValue: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO,
      );
      const canvasPixelSize = CANVAS_SIZE * pixelRatio;

      if (canvas.width !== canvasPixelSize) {
        canvas.width = canvasPixelSize;
        canvas.height = canvasPixelSize;
      }

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const size = CANVAS_SIZE;
      const center = WHEEL_CENTER;
      const radius = WHEEL_RADIUS;
      const frameColor = theme === "dark" ? "#f9fafb" : "#111827";
      const rimShadow =
        theme === "dark"
          ? "rgba(0, 0, 0, 0.45)"
          : "rgba(15, 23, 42, 0.22)";
      const hubOuterColor = theme === "dark" ? "#111827" : "#f8fafc";
      const hubInnerColor = theme === "dark" ? "#1f2937" : "#eef2f7";

      const weightedSegments = getWeightedSegments(items);

      if (weightedSegments.length === 0) {
        ctx.clearRect(0, 0, size, size);

        ctx.beginPath();
        ctx.arc(center, center, radius, 0, FULL_CIRCLE);
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 12;
        ctx.stroke();

        return;
      }

      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.shadowColor = rimShadow;
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 18;
      ctx.beginPath();
      ctx.arc(center, center, radius + 10, 0, FULL_CIRCLE);
      ctx.fillStyle = theme === "dark" ? "#020617" : "#e5e7eb";
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(rotationValue);
      ctx.translate(-center, -center);

      weightedSegments.forEach(({ item, startAngle, endAngle }) => {
        const textAngle = startAngle + (endAngle - startAngle) / 2;
        const segmentAngle = endAngle - startAngle;
        const gradient = ctx.createRadialGradient(
          center,
          center,
          HUB_RADIUS * 0.7,
          center,
          center,
          radius,
        );
        gradient.addColorStop(0, mixColor(item.color, "white", 0.28));
        gradient.addColorStop(0.72, item.color);
        gradient.addColorStop(1, mixColor(item.color, "black", 0.12));

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle =
          theme === "dark" ? "rgba(255, 255, 255, 0.72)" : "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (segmentAngle < 0.13) {
          return;
        }

        const availableWidth = Math.max(36, radius - HUB_RADIUS - 48);
        const fontSize = Math.max(11, Math.min(16, segmentAngle * 23));

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(textAngle);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = getTextColor(item.color);
        ctx.font = `700 ${fontSize}px Arial`;
        ctx.shadowColor =
          theme === "dark" ? "rgba(0, 0, 0, 0.28)" : "rgba(255, 255, 255, 0.55)";
        ctx.shadowBlur = 2;

        const isLeftSide = textAngle > Math.PI / 2 && textAngle < Math.PI * 1.5;
        const labelRadius = HUB_RADIUS + (radius - HUB_RADIUS) * 0.58;

        if (isLeftSide) {
          ctx.rotate(Math.PI);
        }

        const label = truncateTextToWidth(ctx, item.text, availableWidth);
        ctx.fillText(label, isLeftSide ? -labelRadius : labelRadius, 0);
        ctx.restore();
      });

      ctx.restore();

      const rimGradient = ctx.createRadialGradient(
        center,
        center,
        radius - 20,
        center,
        center,
        radius + 18,
      );
      rimGradient.addColorStop(0, "rgba(255, 255, 255, 0.38)");
      rimGradient.addColorStop(0.48, frameColor);
      rimGradient.addColorStop(
        1,
        theme === "dark" ? "#94a3b8" : "rgba(15, 23, 42, 0.78)",
      );

      ctx.beginPath();
      ctx.arc(center, center, radius + 8, 0, FULL_CIRCLE);
      ctx.strokeStyle = rimGradient;
      ctx.lineWidth = 16;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center, center, radius - 2, 0, FULL_CIRCLE);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = rimShadow;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.arc(center, center, HUB_RADIUS, 0, FULL_CIRCLE);
      ctx.fillStyle = hubOuterColor;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(center, center, HUB_RADIUS - 7, 0, FULL_CIRCLE);
      ctx.fillStyle = hubInnerColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(center, center, HUB_RADIUS - 7, 0, FULL_CIRCLE);
      ctx.strokeStyle =
        theme === "dark" ? "rgba(255, 255, 255, 0.22)" : "rgba(15, 23, 42, 0.16)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = rimShadow;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.moveTo(center + radius - 20, center);
      ctx.lineTo(center + radius + 18, center - 22);
      ctx.lineTo(center + radius + 18, center + 22);
      ctx.closePath();
      ctx.fillStyle = theme === "dark" ? "#f8fafc" : "#111827";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = theme === "dark" ? "#111827" : "#ffffff";
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(center + radius + 6, center, 5, 0, FULL_CIRCLE);
      ctx.fillStyle = theme === "dark" ? "#111827" : "#f8fafc";
      ctx.fill();
    },
    [items, theme],
  );

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  function easeOutCubic(progress: number) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function handleSpin() {
    if (isSpinning || !canSpin) return;

    const weightedSegments = getWeightedSegments(items);
    if (weightedSegments.length < 2) return;

    setIsSpinning(true);

    const selected = pickWeightedWinner(weightedSegments.map(({ item }) => item));
    if (!selected) {
      animationFrameRef.current = null;
      setIsSpinning(false);
      return;
    }

    const winningItem = selected;

    const winningSegment = weightedSegments.find(
      ({ item }) => item.id === winningItem.id,
    );

    if (!winningSegment) {
      setIsSpinning(false);
      return;
    }

    const targetRotation = getTargetRotationForSegment(winningSegment);
    const rotationDelta = getClockwiseRotationDelta(
      rotationRef.current,
      targetRotation,
    );

    const extraSpins = FULL_CIRCLE * 6;
    const finalRotation = rotationRef.current + extraSpins + rotationDelta;

    const duration = 3200;
    const startTime = performance.now();
    const startRotation = rotationRef.current;

    let lastTickTime = 0;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easeOutCubic(progress);
      const tickInterval = 20 + progress * 140;

      const animatedRotation =
        startRotation + (finalRotation - startRotation) * easedProgress;

      if (now - lastTickTime > tickInterval) {
        if (!isMuted) {
          const tickAudio = tickAudioRef.current?.cloneNode() as
            | HTMLAudioElement
            | undefined;

          if (tickAudio) {
            tickAudio.volume = 0.6;
            tickAudio.play().catch(() => {});
          }
        }

        lastTickTime = now;
      }

      rotationRef.current = animatedRotation;
      drawWheel(animatedRotation);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        const final = finalRotation % FULL_CIRCLE;
        rotationRef.current = final;
        drawWheel(final);

        setTimeout(() => {
          setResult(winningItem);

          const winAudio = winAudioRef.current;
          if (winAudio && !isMuted) {
            winAudio.currentTime = 0;
            winAudio.play().catch(() => {});
          }
        }, 120);

        if (mode === "elimination") {
          setItems((prev) =>
            prev.map((item) =>
              item.id === winningItem.id ? { ...item, hidden: true } : item,
            ),
          );
        }

        if (mode === "accumulation") {
          setItems((prev) =>
            prev.map((item) =>
              item.id === winningItem.id
                ? { ...item, count: item.count + 1 }
                : item,
            ),
          );
        }

        setIsSpinning(false);
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }

  function handleReset() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setItems(createDefaultItems());
    setResult(null);
    rotationRef.current = 0;
    drawWheel(0);
  }

  function handleResetCount() {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        count: 0,
      })),
    );

    setResult(null);
  }

  return (
    <section className="wheel-card">
      <div className="wheel-stage">
        <canvas
          ref={canvasRef}
          className="wheel-canvas"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
        />

        {visibleItems.length > 1 && (
          <button
            className="center-spin-button"
            onClick={handleSpin}
            disabled={isSpinning || !canSpin}
            aria-label={isSpinning ? "Wheel is spinning" : "Spin the wheel"}
          >
            {isSpinning ? "..." : "SPIN"}
          </button>
        )}
      </div>

      {visibleItems.length <= 1 && (
        <button className="spin-button reset-button" onClick={handleReset}>
          Reset Wheel
        </button>
      )}

      {mode === "accumulation" && (
        <button
          className="spin-button reset-count-button"
          onClick={handleResetCount}
        >
          Reset Count
        </button>
      )}
      {visibleItems.length === 1 && (
        <p className="wheel-status">
          Only <strong>{visibleItems[0].text}</strong> is left. Reset the wheel
          to spin again.
        </p>
      )}

      {visibleItems.length > 1 && !canSpin && (
        <p className="wheel-status">
          At least two visible items must have a weight greater than 0 to spin.
        </p>
      )}

      {result && (
        <ResultModal result={result} onClose={() => setResult(null)} />
      )}
    </section>
  );
}

export default WheelCanvas;
