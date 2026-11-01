import type { DirectorySpace } from "../wayfinding/types";
import { DirectoryPills } from "./DirectoryPills";
import type { DirectoryPillsProps } from "./DirectoryPills";

export interface DirectoryBrowserProps extends DirectoryPillsProps {
  groups: { category: string; spaces: DirectorySpace[] }[];
  onSelect: (space: DirectorySpace) => void;
}

export function DirectoryBrowser({ mode, onChange, groups, onSelect }: DirectoryBrowserProps) {
  return (
    <section className="directory-panel container-fluid px-3 py-3">
      <div className="mx-auto directory-content">
        <DirectoryPills
          mode={mode}
          onChange={onChange}
        />
        <h1 className="h3">Directory</h1>
        <p className="text-secondary">All named spaces on the main level.</p>
        <div className="directory-list">
          {groups.map((group) => (
            <section
              key={group.category}
              className="mb-4"
              aria-labelledby={`directory-${group.category}`}
            >
              <h2
                id={`directory-${group.category}`}
                className="h5"
              >
                {group.category} <span className="text-secondary">({group.spaces.length})</span>
              </h2>
              <div className="list-group">
                {group.spaces.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    className="list-group-item list-group-item-action text-start"
                    onClick={() => onSelect(space)}
                    aria-label={`Select ${space.name} as your destination`}
                  >
                    {space.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
