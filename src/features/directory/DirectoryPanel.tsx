import { normalize, searchDirectory } from "../wayfinding/directory";
import type { DirectoryMode, DirectorySpace, NavigationState, Store } from "../wayfinding/types";
import { DirectoryPills } from "./DirectoryPills";

export interface DirectoryPanelProps {
  mode: DirectoryMode;
  onModeChange: (mode: DirectoryMode) => void;
  savedParking?: Store;
  onShowSavedParking: () => void;
  onRemoveSavedParking: () => void;
  selected?: DirectorySpace;
  directionsReady: boolean;
  navigation: NavigationState;
  search: string;
  spaces: DirectorySpace[];
  onSearchChange: (value: string) => void;
  onSelect: (space: DirectorySpace) => void;
  onStartNavigation: () => void;
  onReturnToSearch: () => void;
  hasStartPoint: boolean;
}

export function DirectoryPanel({
  mode,
  onModeChange,
  savedParking,
  onShowSavedParking,
  onRemoveSavedParking,
  selected,
  directionsReady,
  navigation,
  search,
  spaces,
  onSearchChange,
  onSelect,
  onStartNavigation,
  onReturnToSearch,
  hasStartPoint,
}: DirectoryPanelProps) {
  const results = searchDirectory(spaces, search);
  return (
    <>
      <DirectoryPills
        mode={mode}
        onChange={onModeChange}
      />
      {savedParking && (
        <div
          className="alert alert-success py-2 small d-flex align-items-center gap-2"
          role="status"
        >
          <span className="flex-grow-1">
            Saved parking: <strong>{savedParking.name}</strong>
          </span>
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={onShowSavedParking}
          >
            Show saved parking
          </button>
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            onClick={onRemoveSavedParking}
            aria-label="Remove saved parking"
          >
            Remove
          </button>
        </div>
      )}
      {!selected && !directionsReady && navigation !== "calculating" && (
        <>
          <label
            className="visually-hidden"
            htmlFor="store-search"
          >
            Find anything
          </label>
          <div className="position-relative">
            <input
              id="store-search"
              className="form-control"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Find anything"
              aria-expanded={Boolean(normalize(search))}
              aria-controls="store-results"
            />
            {normalize(search) && (
              <div
                id="store-results"
                className="list-group position-absolute w-100 search-results"
              >
                {results.map((space) => (
                  <button
                    key={space.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => onSelect(space)}
                  >
                    {space.name} <span className="text-secondary">| {space.category}</span>
                  </button>
                ))}
                {!results.length && (
                  <p className="text-secondary p-2 mb-0">No spaces match that search.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
      {navigation === "loading" && (
        <p className="small text-secondary mt-2">Loading map and directory…</p>
      )}
      {selected && (
        <section className="mt-3">
          <h5>{selected.name}</h5>
          <p className="text-secondary small">Main level {selected.category.toLocaleLowerCase()}</p>
          {navigation === "preview" ? (
            <div className="btn-group w-100">
              <button
                className="btn btn-success"
                onClick={onStartNavigation}
              >
                Start
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={onReturnToSearch}
              >
                Return to search
              </button>
            </div>
          ) : navigation === "calculating" ? (
            <button
              className="btn btn-success w-100"
              disabled
            >
              Finding route…
            </button>
          ) : null}
          {!hasStartPoint && (
            <p className="small text-secondary mt-2 mb-0">
              Tap a map space to set the starting point.
            </p>
          )}
          {navigation === "selected" && (
            <button
              className="btn btn-link p-0 mt-2"
              onClick={onReturnToSearch}
            >
              Return to search
            </button>
          )}
        </section>
      )}
    </>
  );
}
