import type { Directions } from "@mappedin/mappedin-js";
import type { NavigationState } from "../wayfinding/types";

const instructionText = (directions: Directions) =>
  directions.instructions.map((instruction) => {
    const action = instruction.action.type.replace(/[_-]/g, " ").toLocaleLowerCase();
    return `${action.charAt(0).toUpperCase()}${action.slice(1)}${instruction.distance ? ` for ${Math.round(instruction.distance)} m` : ""}`;
  });

export interface DirectionsPanelProps {
  destinationName?: string;
  navigation: NavigationState;
  directions?: Directions;
  instructionIndex: number;
  onAction: (action: string) => void;
  onReset: (completed?: boolean) => void;
}

export function DirectionsPanel({
  destinationName,
  navigation,
  directions,
  instructionIndex,
  onAction,
  onReset,
}: DirectionsPanelProps) {
  return (
    <section>
      <h5>Directions to {destinationName}</h5>
      {navigation === "calculating" && <p className="text-secondary">Calculating route…</p>}
      {directions && (
        <>
          <p className="small text-secondary mb-1">
            Step {instructionIndex + 1} of {directions.instructions.length}
          </p>
          <p className="fs-5">{instructionText(directions)[instructionIndex]}</p>
          <div
            className="btn-group mb-3 w-100"
            aria-label="Direction steps"
          >
            <button
              className="btn btn-outline-secondary"
              disabled={instructionIndex === 0}
              onClick={() => onAction(`step-${instructionIndex - 1}`)}
            >
              Previous
            </button>
            {navigation === "preview" && (
              <button
                className="btn btn-primary"
                onClick={() => onAction("simulate")}
              >
                Begin
              </button>
            )}
            {navigation === "simulating" && (
              <button
                className="btn btn-primary"
                onClick={() => onAction("pause")}
              >
                Pause
              </button>
            )}
            {navigation === "paused" && (
              <button
                className="btn btn-primary"
                onClick={() => onAction("simulate")}
              >
                Resume
              </button>
            )}
            {navigation === "arrived" && (
              <button
                className="btn btn-success"
                onClick={() => onReset(true)}
              >
                Done
              </button>
            )}
            <button
              className="btn btn-outline-secondary"
              disabled={instructionIndex >= directions.instructions.length - 1}
              onClick={() => onAction(`step-${instructionIndex + 1}`)}
            >
              Next
            </button>
          </div>
          {navigation !== "arrived" && (
            <button
              className="btn btn-link p-0"
              onClick={() => onReset()}
            >
              Cancel route
            </button>
          )}
        </>
      )}
      {navigation === "error" && (
        <button
          className="btn btn-link"
          onClick={() => onReset()}
        >
          Cancel route
        </button>
      )}
    </section>
  );
}
