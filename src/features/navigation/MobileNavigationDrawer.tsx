import type { Section } from "../wayfinding/types";

const labelFor = (section: Section) =>
  section === "sales"
    ? "Promotions"
    : section === "food"
      ? "Food Court Menus"
      : section[0].toUpperCase() + section.slice(1);

export interface MobileNavigationDrawerProps {
  section: Section;
  closing: boolean;
  onClose: () => void;
  onSectionChange: (section: Section) => void;
}

export function MobileNavigationDrawer({
  section,
  closing,
  onClose,
  onSectionChange,
}: MobileNavigationDrawerProps) {
  return (
    <>
      <div
        className={`offcanvas-backdrop fade show mobile-nav-backdrop ${closing ? "mobile-nav-backdrop--closing" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        id="mobile-primary-navigation"
        className={`offcanvas offcanvas-end show mobile-navigation-drawer ${closing ? "mobile-navigation-drawer--closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={closing}
        aria-label="Primary navigation"
      >
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h5">Navigation</h2>
          <button
            type="button"
            className="btn-close me-3"
            aria-label="Close navigation"
            onClick={onClose}
          />
        </div>
        <div className="offcanvas-body">
          {(["map", "sales", "food", "events"] as Section[]).map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className={`nav-link py-2 ${section === item ? "active fw-semibold" : ""}`}
              onClick={() => {
                onSectionChange(item);
                onClose();
              }}
            >
              {labelFor(item)}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}

export { labelFor };
