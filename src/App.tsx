import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Coordinate, Directions } from "@mappedin/mappedin-js";
import { mallConfig } from "./config/mall";
import { DirectoryBrowser } from "./features/directory/DirectoryBrowser";
import { DirectoryPanel } from "./features/directory/DirectoryPanel";
import { MapCanvas } from "./features/map/MapCanvas";
import { DirectionsPanel } from "./features/navigation/DirectionsPanel";
import { labelFor, MobileNavigationDrawer } from "./features/navigation/MobileNavigationDrawer";
import { formatPromotionDate } from "./features/promotions/formatPromotionDate";
import { PromotionModal } from "./features/promotions/PromotionModal";
import { DemoStatusToast } from "./features/status/DemoStatusToast";
import { groupDirectory, isParking, normalize } from "./features/wayfinding/directory";
import {
  readSavedParking,
  removeSavedParking,
  saveSavedParking,
} from "./features/wayfinding/savedParking";
import type {
  DirectoryMode,
  DirectoryPayload,
  DirectorySpace,
  LocationToastState,
  NavigationState,
  RouteOrigin,
  Section,
  SimulationCameraMode,
  Store,
} from "./features/wayfinding/types";
import type { FoodVendor, MallEvent, Sale } from "./services/content";
import { mockContentService } from "./services/mockContent";

function useContent<T>(resource: string, query: () => Promise<T[]>) {
  return useQuery({
    queryKey: ["mall", mallConfig.propertyId, resource],
    queryFn: query,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export default function App() {
  const [section, setSection] = useState<Section>("map");
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>("search");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [directorySpaces, setDirectorySpaces] = useState<DirectorySpace[]>([]);
  const [startPoint, setStartPoint] = useState<Store>();
  const [routeOrigin, setRouteOrigin] = useState<RouteOrigin>();
  const [savedParking, setSavedParking] = useState<Store | undefined>(readSavedParking);
  const [parkingOffer, setParkingOffer] = useState<Store>();
  const [selectedId, setSelectedId] = useState<string>();
  const [focusedSpaceId, setFocusedSpaceId] = useState<string>();
  const [focusSequence, setFocusSequence] = useState(0);
  const [routeTargetId, setRouteTargetId] = useState<string>();
  const [navigationPanelOpen, setNavigationPanelOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<SimulationCameraMode>("follow");
  const [locationToast, setLocationToast] = useState<LocationToastState>("open");
  const [action, setAction] = useState("");
  const actionSequence = useRef(0);
  const [navigation, setNavigation] = useState<NavigationState>("loading");
  const [directions, setDirections] = useState<Directions>();
  const [instructionIndex, setInstructionIndex] = useState(0);
  const [message, setMessage] = useState<string>();
  const [search, setSearch] = useState("");
  const [promotionSearch, setPromotionSearch] = useState("");
  const [hasLocation, setHasLocation] = useState(false);
  const [arrivalPromotionSpaceId, setArrivalPromotionSpaceId] = useState<string>();
  const sales = useContent<Sale>("sales", () =>
    mockContentService.listSales(mallConfig.propertyId),
  );
  const food = useContent<FoodVendor>("food", () =>
    mockContentService.listFoodVendors(mallConfig.propertyId),
  );
  const events = useContent<MallEvent>("events", () =>
    mockContentService.listEvents(mallConfig.propertyId),
  );

  const filteredPromotions = useMemo(() => {
    const query = normalize(promotionSearch);
    if (!query) return sales.data ?? [];
    return (sales.data ?? []).filter((promotion) =>
      Object.values(promotion).some((value) => normalize(value).includes(query)),
    );
  }, [promotionSearch, sales.data]);
  const directoryGroups = useMemo(() => groupDirectory(directorySpaces), [directorySpaces]);
  const selected = directorySpaces.find((space) => space.id === selectedId);
  const arrivalPromotions =
    sales.data?.filter((promotion) => promotion.spaceId === arrivalPromotionSpaceId) ?? [];
  const arrivalStore = stores.find((store) => store.id === arrivalPromotionSpaceId);
  const dispatchAction = (name: string) => setAction(`${name}-${++actionSequence.current}`);
  const openMobileMenu = () => {
    setMobileMenuClosing(false);
    setMobileMenuOpen(true);
  };
  const closeMobileMenu = () => {
    if (mobileMenuOpen && !mobileMenuClosing) setMobileMenuClosing(true);
  };

  useEffect(() => {
    if (!mobileMenuClosing) return;
    const timer = window.setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [mobileMenuClosing]);

  useEffect(() => {
    if (!arrivalPromotionSpaceId && !mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (arrivalPromotionSpaceId) setArrivalPromotionSpaceId(undefined);
      else closeMobileMenu();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [arrivalPromotionSpaceId, mobileMenuOpen, mobileMenuClosing]);

  const selectStore = (id: string) => {
    setSearch("");
    setSelectedId(id);
    setFocusedSpaceId(undefined);
    setRouteTargetId(routeOrigin ? id : undefined);
    setDirections(undefined);
    setAction("");
    setNavigation(routeOrigin ? "calculating" : "selected");
    setMessage(undefined);
    setDirectoryMode("search");
    setSection("map");
  };
  const focusSpace = (space: DirectorySpace | Store) => {
    if ("isStore" in space) {
      selectStore(space.id);
      return;
    }
    setSelectedId(undefined);
    setRouteTargetId(undefined);
    setDirections(undefined);
    setFocusedSpaceId(space.id);
    setFocusSequence((sequence) => sequence + 1);
    setNavigation("idle");
    setDirectoryMode("search");
    setSection("map");
  };
  const saveParking = () => {
    if (!parkingOffer) return;
    try {
      saveSavedParking(parkingOffer);
      setSavedParking(parkingOffer);
      setParkingOffer(undefined);
    } catch {
      setMessage("Parking could not be saved in this browser.");
      setLocationToast("open");
    }
  };
  const removeParking = () => {
    try {
      removeSavedParking();
    } catch {
      // Storage can be unavailable in private browsing.
    }
    setSavedParking(undefined);
  };
  const startNavigation = () => {
    if (!selectedId || !directions || navigation !== "preview") return;
    if (!routeOrigin) {
      setMessage("Select a starting point on the map before starting navigation.");
      setLocationToast("open");
      return;
    }
    setNavigationPanelOpen(true);
    dispatchAction("follow");
  };
  const resetNavigation = (completed = false) => {
    dispatchAction(completed ? "done" : "cancel");
    setSelectedId(undefined);
    setRouteTargetId(undefined);
    setDirections(undefined);
    setInstructionIndex(0);
    setSearch("");
    setNavigation("idle");
    setNavigationPanelOpen(false);
    setMessage(undefined);
  };
  const returnToSearch = () => {
    dispatchAction("clear-route");
    setSelectedId(undefined);
    setRouteTargetId(undefined);
    setDirections(undefined);
    setInstructionIndex(0);
    setNavigation("idle");
    setSearch("");
  };
  const findOnMap = (name?: string) => {
    const store = stores.find((item) => normalize(item.name) === normalize(name ?? ""));
    if (store) selectStore(store.id);
  };
  const content = <
    T extends {
      id: string;
      title?: string;
      name?: string;
      description?: string;
      storeName?: string;
    },
  >(
    result: ReturnType<typeof useContent<T>>,
    render: (item: T) => ReactElement,
    items = result.data,
    emptyMessage = "No sample content is available.",
  ) => {
    if (result.isPending) return <p className="text-secondary">Loading sample content…</p>;
    if (result.isError)
      return (
        <div className="alert alert-danger">
          Sample content could not be loaded.{" "}
          <button
            className="btn btn-link p-0"
            onClick={() => void result.refetch()}
          >
            Retry
          </button>
        </div>
      );
    if (!items?.length) return <p className="text-secondary">{emptyMessage}</p>;
    return <div className="row g-3">{items.map(render)}</div>;
  };

  return (
    <div className="app-shell">
      <header className="navbar navbar-expand-md navbar-dark bg-primary fixed-top px-3 px-md-4">
        <a
          className="navbar-brand fw-bold"
          href="#map"
          onClick={() => setSection("map")}
        >
          Greenfield Mall Group
        </a>
        <button
          className="navbar-toggler d-md-none"
          type="button"
          aria-controls="mobile-primary-navigation"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation"
          onClick={() => (mobileMenuOpen ? closeMobileMenu() : openMobileMenu())}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <nav
          className="d-none d-md-flex flex-row ms-auto"
          aria-label="Primary navigation"
        >
          {(["map", "sales", "food", "events"] as Section[]).map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className={`nav-link px-2 text-white ${section === item ? "active" : ""}`}
              onClick={() => setSection(item)}
            >
              {labelFor(item)}
            </a>
          ))}
        </nav>
      </header>
      {mobileMenuOpen && (
        <MobileNavigationDrawer
          section={section}
          closing={mobileMenuClosing}
          onClose={closeMobileMenu}
          onSectionChange={setSection}
        />
      )}
      <main
        className={`app-main ${section === "map" ? `map-page ${directoryMode === "browse" ? "directory-page" : ""}` : `content-page content-page--${section}`}`}
      >
        {section === "map" && directoryMode === "browse" && (
          <DirectoryBrowser
            mode={directoryMode}
            onChange={setDirectoryMode}
            groups={directoryGroups}
            onSelect={focusSpace}
          />
        )}
        {section === "map" && directoryMode === "search" && (
          <div className="row g-0 h-100">
            <aside className="col-12 col-lg-4 p-3 border-end overflow-visible bg-white">
              {!navigationPanelOpen ? (
                <DirectoryPanel
                  mode={directoryMode}
                  onModeChange={setDirectoryMode}
                  savedParking={savedParking}
                  onShowSavedParking={() => savedParking && focusSpace(savedParking)}
                  onRemoveSavedParking={removeParking}
                  selected={selected}
                  directionsReady={Boolean(directions)}
                  navigation={navigation}
                  search={search}
                  spaces={directorySpaces}
                  onSearchChange={setSearch}
                  onSelect={focusSpace}
                  onStartNavigation={startNavigation}
                  onReturnToSearch={returnToSearch}
                  hasStartPoint={Boolean(startPoint)}
                />
              ) : (
                <DirectionsPanel
                  destinationName={selected?.name}
                  navigation={navigation}
                  directions={directions}
                  instructionIndex={instructionIndex}
                  onAction={dispatchAction}
                  onReset={resetNavigation}
                />
              )}
            </aside>
            <section className="col-12 col-lg-8 map-column position-relative">
              <div className="map-controls position-absolute top-0 end-0 p-3">
                <button
                  className="btn btn-primary shadow-sm"
                  disabled={!hasLocation}
                  onClick={() => dispatchAction("where-am-i")}
                >
                  Where am I?
                </button>
              </div>
              <MapCanvas
                selectedStoreId={selectedId}
                focusedSpaceId={focusedSpaceId}
                focusSequence={focusSequence}
                routeOrigin={routeOrigin}
                routeTargetId={routeTargetId}
                cameraMode={cameraMode}
                action={action}
                promotions={sales.data ?? []}
                onReady={({ stores: loadedStores, namedSpaces }: DirectoryPayload) => {
                  setStores(loadedStores);
                  setDirectorySpaces(namedSpaces);
                }}
                onStartSelection={(id, name) => {
                  const location = { id, name, floorId: mallConfig.mainFloorId };
                  setStartPoint(location);
                  setRouteOrigin({ kind: "space", spaceId: id });
                  if (isParking(name)) setParkingOffer(location);
                  setRouteTargetId(selectedId);
                  setLocationToast("open");
                  setDirections(undefined);
                  setInstructionIndex(0);
                  setAction("");
                }}
                onRouteOriginChange={(origin, name) => {
                  setRouteOrigin(origin);
                  setStartPoint({
                    id: origin.kind === "space" ? origin.spaceId : "current-location",
                    name,
                    floorId: mallConfig.mainFloorId,
                  });
                }}
                onInstructionChange={setInstructionIndex}
                onState={(state, route) => {
                  setNavigation(state);
                  if (route) setDirections(route);
                }}
                onMessage={(notice) => {
                  setMessage(notice);
                  if (notice) setLocationToast("open");
                }}
                onArrival={(spaceId, coordinate: Coordinate) => {
                  setRouteOrigin({ kind: "current-location", coordinate });
                  setStartPoint({
                    id: "current-location",
                    name: "Current simulated location",
                    floorId: mallConfig.mainFloorId,
                  });
                  setRouteTargetId(undefined);
                  setArrivalPromotionSpaceId(
                    sales.data?.some((promotion) => promotion.spaceId === spaceId)
                      ? spaceId
                      : undefined,
                  );
                }}
                onLocationAvailable={setHasLocation}
              />
            </section>
          </div>
        )}
        {section === "sales" && (
          <section className="container py-4">
            <h2>Promotions</h2>
            <label
              className="visually-hidden"
              htmlFor="promotion-search"
            >
              Find promotions
            </label>
            <div className="input-group mb-4">
              <input
                id="promotion-search"
                type="search"
                className="form-control"
                value={promotionSearch}
                onChange={(event) => setPromotionSearch(event.target.value)}
                placeholder="Search promotions"
              />
            </div>
            {content(
              sales,
              (sale) => (
                <article
                  key={sale.id}
                  className="col-md-6"
                >
                  <div className="card h-100 shadow-lg">
                    <div className="card-body">
                      <p className="text-secondary small mb-1">{sale.storeName}</p>
                      <h5>{sale.title}</h5>
                      <p className="fs-5 fw-semibold">{sale.offer}</p>
                      <p>{sale.description}</p>
                      <p className="small text-secondary">
                        {formatPromotionDate(sale.validFrom)}–{formatPromotionDate(sale.validUntil)}
                      </p>
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => findOnMap(sale.storeName)}
                      >
                        Find on map
                      </button>
                    </div>
                  </div>
                </article>
              ),
              filteredPromotions,
              "No promotions match that search.",
            )}
          </section>
        )}
        {section === "food" && (
          <section className="container py-4">
            <h2>Food Court Menus</h2>
            {content(food, (vendor) => (
              <article
                key={vendor.id}
                className="col-md-6"
              >
                <div className="card h-100 shadow-lg">
                  <div className="card-body">
                    <h5>{vendor.name}</h5>
                    <ul className="list-group list-group-flush mb-3">
                      {vendor.menu.map((item) => (
                        <li
                          key={item.id}
                          className="list-group-item px-0"
                        >
                          {item.name} —{" "}
                          {(item.priceMinor / 100).toLocaleString("en-CA", {
                            style: "currency",
                            currency: item.currency,
                          })}
                          <small className="d-block text-secondary">{item.description}</small>
                        </li>
                      ))}
                    </ul>
                    {vendor.storeName && (
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => findOnMap(vendor.storeName)}
                      >
                        Find on map
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
        {section === "events" && (
          <section className="container py-4">
            <h2>Events</h2>
            {content(events, (event) => (
              <article
                key={event.id}
                className="col-md-6"
              >
                <div className="card h-100 shadow-lg">
                  <div className="card-body">
                    <h5>{event.title}</h5>
                    <p>{event.description}</p>
                    <p className="small text-secondary">
                      {event.location} · {new Date(event.startsAt).toLocaleString()}
                    </p>
                    {event.storeName && (
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => findOnMap(event.storeName)}
                      >
                        Find on map
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
      {parkingOffer && (
        <aside
          className="position-fixed bottom-0 start-0 p-3 location-toast"
          role="dialog"
          aria-labelledby="save-parking-title"
        >
          <div className="card shadow">
            <div className="card-body">
              <h2
                id="save-parking-title"
                className="h5"
              >
                Save parking?
              </h2>
              <p className="mb-3">
                Save <strong>{parkingOffer.name}</strong> so you can find it later.
              </p>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveParking}
                >
                  Save parking
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setParkingOffer(undefined)}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
      {arrivalPromotionSpaceId && (
        <PromotionModal
          key={arrivalPromotionSpaceId}
          storeName={arrivalStore?.name}
          promotions={arrivalPromotions}
          onClose={() => setArrivalPromotionSpaceId(undefined)}
        />
      )}
      <DemoStatusToast
        startPoint={startPoint}
        message={message}
        navigation={navigation}
        directions={directions}
        cameraMode={cameraMode}
        state={locationToast}
        onStateChange={setLocationToast}
        onCameraModeChange={setCameraMode}
      />
    </div>
  );
}
