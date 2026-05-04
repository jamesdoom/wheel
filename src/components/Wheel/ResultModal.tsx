import type { WheelItem } from "../../types";
import "./ResultModal.css";

type ResultModalProps = {
  result: WheelItem;
  onClose: () => void;
};

function ResultModal({ result, onClose }: ResultModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="result-modal">
        <p className="modal-label">Result</p>

        <h2>{result.text}</h2>

        <button className="modal-close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default ResultModal;
