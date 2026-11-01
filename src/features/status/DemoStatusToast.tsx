import type { Directions } from "@mappedin/mappedin-js";
import type {
  LocationToastState,
  NavigationState,
  SimulationCameraMode,
  Store,
} from "../wayfinding/types";

export interface DemoStatusToastProps {
  startPoint?: Store;
  message?: string;
  navigation: NavigationState;
  directions?: Directions;
  cameraMode: SimulationCameraMode;
  state: LocationToastState;
  onStateChange: (state: LocationToastState) => void;
  onCameraModeChange: (mode: SimulationCameraMode) => void;
}

export function DemoStatusToast({
  startPoint,
  message,
  navigation,
  directions,
  cameraMode,
  state,
  onStateChange,
  onCameraModeChange,
}: DemoStatusToastProps) {
  if ((!startPoint && !message) || state === "dismissed") return null;
  return (
    <aside
      className="position-fixed bottom-0 end-0 p-3 location-toast"
      role="status"
      aria-live="polite"
    >
      {state === "open" ? (
        <div
          className="toast show border-success"
          role="alert"
        >
          <div className="toast-header">
            <strong className="me-auto">Demo status</strong>
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => onStateChange("minimized")}
            >
              Minimize
            </button>
            <button
              type="button"
              className="btn-close ms-2"
              aria-label="Dismiss demo status"
              onClick={() => onStateChange("dismissed")}
            />
          </div>
          <div className="toast-body">
            <p className="mb-1 small text-secondary">Demo venue · Main level</p>
            {startPoint && (
              <p className="mb-1">
                Simulated location: <strong>{startPoint.name}</strong>.
              </p>
            )}
            {message && (
              <p className={`mb-0 ${navigation === "error" ? "text-danger" : ""}`}>{message}</p>
            )}
            {directions && (
              <div className="border-top mt-2 pt-2">
                <p className="small text-secondary mb-1">Navigation camera</p>
                <div
                  className="btn-group btn-group-sm w-100"
                  aria-label="Navigation camera"
                >
                  <button
                    className={`btn btn-outline-primary ${cameraMode === "follow" ? "active" : ""}`}
                    onClick={() => onCameraModeChange("follow")}
                  >
                    Follow
                  </button>
                  <button
                    className={`btn btn-outline-primary ${cameraMode === "float" ? "active" : ""}`}
                    onClick={() => onCameraModeChange("float")}
                  >
                    Float
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          className="btn btn-success shadow-sm"
          onClick={() => onStateChange("open")}
        >
          Show demo status
        </button>
      )}
    </aside>
  );
}
