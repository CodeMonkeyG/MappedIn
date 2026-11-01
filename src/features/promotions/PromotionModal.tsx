import { useEffect, useRef } from "react";
import type { Sale } from "../../services/content";
import { formatPromotionDate } from "./formatPromotionDate";

export interface PromotionModalProps {
  storeName?: string;
  promotions: Sale[];
  onClose: () => void;
}

export function PromotionModal({ storeName, promotions, onClose }: PromotionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <>
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arrival-promotion-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2
                id="arrival-promotion-title"
                className="modal-title fs-5"
              >
                Welcome to {storeName ?? "your destination"}
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Close promotion"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              {promotions.map((promotion) => (
                <article key={promotion.id}>
                  <p className="text-secondary mb-1">{promotion.title}</p>
                  <p className="fs-4 fw-semibold">{promotion.offer}</p>
                  <p>{promotion.description}</p>
                  <p className="small text-secondary mb-0">
                    Valid {formatPromotionDate(promotion.validFrom)}–
                    {formatPromotionDate(promotion.validUntil)}
                  </p>
                </article>
              ))}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
