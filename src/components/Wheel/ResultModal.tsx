import type { WheelItem } from "../../types";
import "./ResultModal.css";
import confetti from "canvas-confetti";
import { useEffect } from "react";

type ResultModalProps = {
  result: WheelItem;
  onClose: () => void;
};

function ResultModal({ result, onClose }: ResultModalProps) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="result-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="winner-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="modal-label">Winner</p>

        <div className="winner-badge">🎉</div>

        <h2 id="winner-title">{result.text}</h2>

        <button className="modal-close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default ResultModal;
