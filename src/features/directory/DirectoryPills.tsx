import type { DirectoryMode } from "../wayfinding/types";

export interface DirectoryPillsProps {
  mode: DirectoryMode;
  onChange: (mode: DirectoryMode) => void;
}

export function DirectoryPills({ mode, onChange }: DirectoryPillsProps) {
  return (
    <nav
      className="d-flex align-items-center mb-3"
      aria-label="Directory"
    >
      <span className="small fw-semibold me-2">Directory:</span>
      <div className="nav nav-pills d-inline-flex">
        <button
          type="button"
          className={`nav-link py-1 px-2 ${mode === "search" ? "active" : ""}`}
          onClick={() => onChange("search")}
        >
          Search
        </button>
        <button
          type="button"
          className={`nav-link py-1 px-2 ${mode === "browse" ? "active" : ""}`}
          onClick={() => onChange("browse")}
        >
          Browse
        </button>
      </div>
    </nav>
  );
}
