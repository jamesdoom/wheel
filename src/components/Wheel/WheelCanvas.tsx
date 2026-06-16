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

      const size = canvas.width;
      const center = size / 2;
      const radius = center - 10;
      const frameColor = theme === "dark" ? "#f9fafb" : "#111827";

      const weightedSegments = getWeightedSegments(items);

      if (weightedSegments.length === 0) {
        ctx.clearRect(0, 0, size, size);

        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 8;
        ctx.stroke();

        return;
      }

      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(rotationValue);
      ctx.translate(-center, -center);

      weightedSegments.forEach(({ item, startAngle, endAngle }) => {
        const textAngle = startAngle + (endAngle - startAngle) / 2;

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();

        // Draw border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(textAngle);
        ctx.textAlign = "right";
        ctx.fillStyle = "#111827";
        ctx.font = "bold 16px Arial";
        ctx.fillText(item.text, radius - 24, 6);
        ctx.restore();
      });

      ctx.restore();

      // Outer ring
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 8;
      ctx.stroke();

      // Pointer
      ctx.beginPath();
      ctx.moveTo(center + radius + 4, center);
      ctx.lineTo(center + radius + 28, center - 14);
      ctx.lineTo(center + radius + 28, center + 14);
      ctx.closePath();
      ctx.fillStyle = frameColor;
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
      <canvas
        ref={canvasRef}
        className="wheel-canvas"
        width={420}
        height={420}
      />

      {visibleItems.length <= 1 ? (
        <button className="spin-button reset-button" onClick={handleReset}>
          Reset Wheel
        </button>
      ) : (
        <button
          className="spin-button"
          onClick={handleSpin}
          disabled={isSpinning || !canSpin}
        >
          {isSpinning ? "Spinning..." : "Spin"}
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
