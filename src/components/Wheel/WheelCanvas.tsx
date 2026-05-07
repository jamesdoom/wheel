import { useCallback, useEffect, useRef, useState } from "react";
import type { WheelItem, WheelMode } from "../../types";
import "./WheelCanvas.css";
import ResultModal from "./ResultModal";

type WheelCanvasProps = {
  items: WheelItem[];
  setItems: React.Dispatch<React.SetStateAction<WheelItem[]>>;
  mode: WheelMode;
  createDefaultItems: () => WheelItem[];
  isMuted: boolean;
};

function WheelCanvas({
  items,
  setItems,
  mode,
  createDefaultItems,
  isMuted,
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
  const canSpin = visibleItems.length > 1;

  const drawWheel = useCallback(
    (rotationValue: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const radius = center - 10;

      const visibleItems = items.filter((item) => !item.hidden);

      if (visibleItems.length === 0) {
        ctx.clearRect(0, 0, size, size);

        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 8;
        ctx.stroke();

        return;
      }

      const sliceAngle = (Math.PI * 2) / visibleItems.length;

      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(rotationValue);
      ctx.translate(-center, -center);

      visibleItems.forEach((item, index) => {
        const startAngle = index * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        const textAngle = startAngle + sliceAngle / 2;

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
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Pointer
      ctx.beginPath();
      ctx.moveTo(center + radius + 4, center);
      ctx.lineTo(center + radius + 28, center - 14);
      ctx.lineTo(center + radius + 28, center + 14);
      ctx.closePath();
      ctx.fillStyle = "#111827";
      ctx.fill();
    },
    [items],
  );

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  function pickWeightedWinner(items: WheelItem[]): WheelItem | null {
    const weightedItems = items.filter((item) => item.weight > 0);
    if (weightedItems.length === 0) return null;

    const totalWeight = weightedItems.reduce(
      (sum, item) => sum + item.weight,
      0,
    );
    let random = Math.random() * totalWeight;

    for (const item of weightedItems) {
      random -= item.weight;
      if (random <= 0) return item;
    }

    return weightedItems[weightedItems.length - 1];
  }

  function easeOutCubic(progress: number) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function handleSpin() {
    if (isSpinning || !canSpin) return;

    const visibleItems = items.filter((item) => !item.hidden);
    if (visibleItems.length === 0) return;

    setIsSpinning(true);

    const fullCircle = Math.PI * 2;
    const sliceAngle = fullCircle / visibleItems.length;

    const selected = pickWeightedWinner(visibleItems);
    if (!selected) {
      animationFrameRef.current = null;
      setIsSpinning(false);
      return;
    }

    const winningItem = selected;

    const winnerIndex = visibleItems.findIndex(
      (item) => item.id === winningItem.id,
    );

    if (winnerIndex === -1) {
      setIsSpinning(false);
      return;
    }

    const targetAngle = winnerIndex * sliceAngle + sliceAngle / 2;
    const targetRotation = (fullCircle - targetAngle) % fullCircle;

    const currentRotation =
      ((rotationRef.current % fullCircle) + fullCircle) % fullCircle;
    const rotationDelta =
      (targetRotation - currentRotation + fullCircle) % fullCircle;

    const extraSpins = fullCircle * 6;
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
        const final = finalRotation % fullCircle;
        rotationRef.current = final;
        drawWheel(final);

        setTimeout(() => {
          setResult(winningItem);
        }, 120);

        const winAudio = winAudioRef.current;
        if (winAudio && !isMuted) {
          winAudio.currentTime = 0;
          winAudio.play().catch(() => {});
        }

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

      {canSpin ? (
        <button
          className="spin-button"
          onClick={handleSpin}
          disabled={isSpinning}
        >
          {isSpinning ? "Spinning..." : "Spin"}
        </button>
      ) : (
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

      {result && (
        <ResultModal result={result} onClose={() => setResult(null)} />
      )}
    </section>
  );
}

export default WheelCanvas;
