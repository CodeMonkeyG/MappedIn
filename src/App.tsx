import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BlueDot } from '@mappedin/blue-dot';
import { DOORS, getMapData, show3dMap } from '@mappedin/mappedin-js';
import type { Directions, Label, Space } from '@mappedin/mappedin-js';
import { hasMapCredentials, mallConfig } from './config/mall';
import { mockContentService } from './services/mockContent';
import type { FoodVendor, MallEvent, Sale } from './services/content';

type Section = 'map' | 'sales' | 'food' | 'events';
type Store = { id: string; name: string; floorId: string };
type NavigationState = 'loading' | 'idle' | 'selected' | 'calculating' | 'preview' | 'simulating' | 'paused' | 'arrived' | 'error';
type SimulationCameraMode = 'follow' | 'float';
type LocationToastState = 'open' | 'minimized' | 'dismissed';

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isStore = (space: Space) => Boolean(space.name?.trim()) && !/entrance|parking|restroom|information desk|guest services|safe/i.test(space.name);
const instructionText = (direction: Directions) =>
  direction.instructions.map((instruction) => {
    const action = instruction.action.type.replace(/[_-]/g, ' ').toLocaleLowerCase();
    return `${action.charAt(0).toUpperCase()}${action.slice(1)}${instruction.distance ? ` for ${Math.round(instruction.distance)} m` : ''}`;
  });

function MapCanvas({
  selectedStoreId, startSpaceId, routeTargetId, cameraMode, action, onReady, onStartSelection, onInstructionChange, onState, onMessage,
}: {
  selectedStoreId?: string; startSpaceId?: string; routeTargetId?: string; cameraMode: SimulationCameraMode; action: string;
  onReady: (stores: Store[]) => void; onStartSelection: (id: string, name: string) => void;
  onInstructionChange: (index: number) => void;
  onState: (state: NavigationState, directions?: Directions) => void; onMessage: (message?: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<{ mapData: Awaited<ReturnType<typeof getMapData>>; mapView: Awaited<ReturnType<typeof show3dMap>>; blueDot: BlueDot; stores: Space[]; labels: Record<string, Label> } | undefined>(undefined);
  const route = useRef<Directions | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const routeToken = useRef(0);
  const simulationIndex = useRef(0);
  const highlightedDestination = useRef<Space | undefined>(undefined);
  const highlightTimer = useRef<number | undefined>(undefined);
  const highlightToken = useRef(0);
  const onStartSelectionRef = useRef(onStartSelection);
  const setSimulationCamera = (mode: SimulationCameraMode) => {
    runtime.current?.blueDot.follow(
      mode === 'follow' ? 'position-and-path-direction' : 'position-only',
      mode === 'follow'
        ? { zoomLevel: 20, pitch: 45, duration: 500 }
        : { zoomLevel: 17, pitch: 0, bearing: 0, duration: 500 },
    );
  };

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = undefined;
    runtime.current?.blueDot.follow(false);
    runtime.current?.blueDot.disable();
  };
  const reset = () => {
    stop();
    route.current = undefined;
    simulationIndex.current = 0;
    void runtime.current?.mapView.Navigation.clear();
    const startingSpace = runtime.current?.mapData.getByType('space').find((space) => space.id === startSpaceId);
    if (startingSpace) void runtime.current?.mapView.Camera.focusOn(startingSpace, { pitch: 0, bearing: 0, duration: 700 });
    onState(selectedStoreId ? 'selected' : 'idle');
    onMessage();
  };

  useEffect(() => {
    onStartSelectionRef.current = onStartSelection;
  }, [onStartSelection]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        if (!hasMapCredentials) throw new Error('Map credentials are not configured. Set VITE_MAPPEDIN_KEY and VITE_MAPPEDIN_SECRET.');
        const mapData = await getMapData(mallConfig.credentials);
        if (disposed || !containerRef.current) return;
        const mapView = await show3dMap(containerRef.current, mapData);
        if (disposed) return;
        const stores = mapData.getByType('space').filter((space) => space.floor?.id === mallConfig.mainFloorId && isStore(space));
        const labels: Record<string, Label> = {};
        mapData.getByType('space').forEach((space) => {
          mapView.updateState(space, { interactive: Boolean(space.name) });
          if (space.name?.trim()) {
            labels[space.id] = mapView.Labels.add(space, space.name, { interactive: true });
            mapView.updateState(labels[space.id], { enabled: true });
          }
        });
        mapView.updateState(DOORS.Interior, { visible: true });
        mapView.updateState(DOORS.Exterior, { visible: true, color: 'black' });
        runtime.current = { mapData, mapView, blueDot: new BlueDot(mapView), stores, labels };
        onReady(stores.map((space) => ({ id: space.id, name: space.name, floorId: mallConfig.mainFloorId })));
        onState('idle');
        mapView.on('click', (event) => {
          const target = event?.spaces?.[0];
          if (!target) return;
          stop();
          route.current = undefined;
          simulationIndex.current = 0;
          const coordinate = target.anchorTarget;
          runtime.current?.blueDot.enable({ watchDevicePosition: false, preventOutOfBounds: false, accuracyThreshold: 50 });
          runtime.current?.blueDot.update({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            floorOrFloorId: coordinate.floorId ?? target.floor?.id,
            accuracy: 0,
          }, { animate: true });
          void mapView.Navigation.clear();
          onStartSelectionRef.current(target.id, target.name?.trim() || 'Selected map point');
          onState('selected');
          onMessage();
        });
      } catch (error) {
        onState('error');
        onMessage(error instanceof Error ? error.message : 'The map could not be loaded. Please retry.');
      }
    };
    void load();
    return () => {
      disposed = true;
      routeToken.current += 1;
      highlightToken.current += 1;
      if (highlightTimer.current) window.clearInterval(highlightTimer.current);
      stop();
      void runtime.current?.mapView.Navigation.clear();
    };
  }, []);

  useEffect(() => {
    const target = runtime.current?.stores.find((store) => store.id === selectedStoreId);
    const current = runtime.current;
    if (!current) return;
    const token = ++highlightToken.current;
    if (highlightTimer.current) window.clearInterval(highlightTimer.current);
    if (highlightedDestination.current) current.mapView.updateState(highlightedDestination.current, { color: undefined });
    highlightedDestination.current = target;
    if (target) {
      let highlighted = false;
      const blink = () => {
        highlighted = !highlighted;
        current.mapView.updateState(target, { color: highlighted ? '#3f9b68' : undefined });
      };
      void current.mapView.Camera.focusOn(
        current.mapData.getByType('space').filter((space) => space.floor?.id === mallConfig.mainFloorId),
        { pitch: 0, bearing: 0, duration: 1400 },
      ).then(() => {
        if (token !== highlightToken.current) return;
        blink();
        highlightTimer.current = window.setInterval(blink, 750);
      });
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (timer.current) setSimulationCamera(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    const current = runtime.current;
    if (!current || !routeTargetId || !startSpaceId) return;
    const destination = current.stores.find((store) => store.id === routeTargetId);
    const origin = current.mapData.getByType('space').find((space) => space.id === startSpaceId);
    if (!destination || !origin) return;
    const token = ++routeToken.current;
    stop();
    route.current = undefined;
    onState('calculating');
    onMessage();
    void (async () => {
      current.mapView.Navigation.clear();
      try {
        const directions = await current.mapData.getDirections(origin, destination);
        if (token !== routeToken.current) return;
        if (!directions) throw new Error('No route is available for this entrance and store.');
        if (!directions.coordinates.length) throw new Error('You are already at this destination.');
        if (!directions.instructions.length) throw new Error('This route does not include usable turn-by-turn instructions.');
        route.current = directions;
        simulationIndex.current = 0;
        onInstructionChange(0);
        await current.mapView.Navigation.draw(directions);
        await current.mapView.Camera.focusOn(directions.coordinates, {
          pitch: 0,
          bearing: 0,
          duration: 900,
          screenOffsets: { top: 0.12, right: 0.12, bottom: 0.12, left: 0.12, type: 'portion' },
        });
        if (token === routeToken.current) onState('preview', directions);
      } catch (error) {
        if (token === routeToken.current) {
          onState('error');
          onMessage(error instanceof Error ? error.message : 'Directions could not be calculated.');
        }
      }
    })();
  }, [routeTargetId, startSpaceId]);

  useEffect(() => {
    if (!runtime.current) return;
    if (action === 'cancel' || action === 'done') reset();
    if (action === 'clear-route') {
      route.current = undefined;
      simulationIndex.current = 0;
      void runtime.current.mapView.Navigation.clear();
      onState('idle');
      onMessage();
    }
    if (action === 'follow' && route.current) setSimulationCamera('follow');
    if (action === 'simulate' && route.current) {
      const directions = route.current;
      const instructionCoordinateIndexes = directions.instructions.map((instruction) =>
        directions.coordinates.reduce((nearestIndex, coordinate, index, coordinates) => {
          const nearest = coordinates[nearestIndex];
          const distance = (coordinate.latitude - instruction.coordinate.latitude) ** 2 + (coordinate.longitude - instruction.coordinate.longitude) ** 2;
          const nearestDistance = (nearest.latitude - instruction.coordinate.latitude) ** 2 + (nearest.longitude - instruction.coordinate.longitude) ** 2;
          return distance < nearestDistance ? index : nearestIndex;
        }, 0),
      );
      let index = simulationIndex.current;
      runtime.current.blueDot.enable({ watchDevicePosition: false, preventOutOfBounds: false, accuracyThreshold: 50 });
      setSimulationCamera(cameraMode);
      onState('simulating', directions);
      const advance = () => {
        const coordinate = directions.coordinates[index];
        runtime.current?.blueDot.update({ latitude: coordinate.latitude, longitude: coordinate.longitude, floorOrFloorId: coordinate.floorId, accuracy: 0 }, { animate: true });
        runtime.current?.mapView.Navigation.trackCoordinate(coordinate, { mode: 'travelled' });
        onInstructionChange(instructionCoordinateIndexes.reduce((activeInstruction, instructionCoordinateIndex, instructionIndex) =>
          instructionCoordinateIndex <= index ? instructionIndex : activeInstruction, 0));
        if (index >= directions.coordinates.length - 1) {
          stop();
          onState('arrived', directions);
          onMessage('Simulated arrival. You have reached your destination.');
        } else {
          index += 1;
          simulationIndex.current = index;
        }
      };
      advance();
      timer.current = window.setInterval(advance, 700);
    }
    if (action === 'pause' && timer.current) { window.clearInterval(timer.current); timer.current = undefined; onState('paused', route.current); }
  }, [action]);

  return <div ref={containerRef} className="mappedin-map" aria-label="Interactive Greenfield Mall map" />;
}

function useContent<T>(resource: string, query: () => Promise<T[]>) {
  return useQuery({ queryKey: ['mall', mallConfig.propertyId, resource], queryFn: query, staleTime: Infinity, retry: false, refetchOnWindowFocus: false });
}

export default function App() {
  const [section, setSection] = useState<Section>('map');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [startPoint, setStartPoint] = useState<Store>();
  const [selectedId, setSelectedId] = useState<string>();
  const [routeTargetId, setRouteTargetId] = useState<string>();
  const [navigationPanelOpen, setNavigationPanelOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<SimulationCameraMode>('follow');
  const [locationToast, setLocationToast] = useState<LocationToastState>('open');
  const [action, setAction] = useState('');
  const [navigation, setNavigation] = useState<NavigationState>('loading');
  const [directions, setDirections] = useState<Directions>();
  const [instructionIndex, setInstructionIndex] = useState(0);
  const [message, setMessage] = useState<string>();
  const [search, setSearch] = useState('');
  const sales = useContent<Sale>('sales', () => mockContentService.listSales(mallConfig.propertyId));
  const food = useContent<FoodVendor>('food', () => mockContentService.listFoodVendors(mallConfig.propertyId));
  const events = useContent<MallEvent>('events', () => mockContentService.listEvents(mallConfig.propertyId));
  const searchResults = useMemo(() => {
    const query = normalize(search);
    if (!query) return [];
    const match = new RegExp(escapeRegex(query), 'i');
    const startsWith = new RegExp(`^${escapeRegex(query)}`, 'i');
    return stores
      .filter((store) => match.test(normalize(store.name)))
      .sort((left, right) => {
        const leftStarts = startsWith.test(normalize(left.name));
        const rightStarts = startsWith.test(normalize(right.name));
        return leftStarts === rightStarts ? left.name.localeCompare(right.name) : leftStarts ? -1 : 1;
      });
  }, [stores, search]);
  const selected = stores.find((store) => store.id === selectedId);
  const selectStore = (id: string) => { setSearch(''); setSelectedId(id); setRouteTargetId(startPoint ? id : undefined); setDirections(undefined); setAction(''); setNavigation(startPoint ? 'calculating' : 'selected'); setMessage(undefined); setSection('map'); };
  const startNavigation = () => {
    if (!selectedId || !directions || navigation !== 'preview') return;
    if (!startPoint) {
      setMessage('Select a starting point on the map before starting navigation.');
      setLocationToast('open');
      return;
    }
    setNavigationPanelOpen(true);
    setAction('follow');
  };
  const resetNavigation = () => {
    setAction('cancel');
    setStartPoint(undefined);
    setSelectedId(undefined);
    setRouteTargetId(undefined);
    setDirections(undefined);
    setInstructionIndex(0);
    setSearch('');
    setNavigation('idle');
    setNavigationPanelOpen(false);
    setMessage(undefined);
  };
  const returnToSearch = () => {
    setAction('clear-route');
    setSelectedId(undefined);
    setRouteTargetId(undefined);
    setDirections(undefined);
    setInstructionIndex(0);
    setNavigation('idle');
    setSearch('');
  };
  const findOnMap = (name?: string) => { const store = stores.find((item) => normalize(item.name) === normalize(name ?? '')); if (store) selectStore(store.id); };
  const content = <T extends { id: string; title?: string; name?: string; description?: string; storeName?: string }>(result: ReturnType<typeof useContent<T>>, render: (item: T) => ReactElement) => {
    if (result.isPending) return <p className="text-secondary">Loading sample content…</p>;
    if (result.isError) return <div className="alert alert-danger">Sample content could not be loaded. <button className="btn btn-link p-0" onClick={() => void result.refetch()}>Retry</button></div>;
    if (!result.data?.length) return <p className="text-secondary">No sample content is available.</p>;
    return <div className="row g-3">{result.data.map(render)}</div>;
  };

  return <div className="app-shell">
    <header className="navbar navbar-expand-md navbar-dark bg-primary px-3 px-md-4">
      <a className="navbar-brand fw-bold" href="#map" onClick={() => setSection('map')}>Greenfield Mall Group</a>
      <button className="navbar-toggler d-md-none" type="button" aria-controls="primary-navigation" aria-expanded={mobileMenuOpen} aria-label="Toggle navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
        <span className="navbar-toggler-icon" />
      </button>
      <nav id="primary-navigation" className={`${mobileMenuOpen ? 'd-flex' : 'd-none'} d-md-flex flex-column flex-md-row ms-md-auto`} aria-label="Primary navigation">
        {(['map', 'sales', 'food', 'events'] as Section[]).map((item) => <a key={item} href={`#${item}`} className={`nav-link px-2 text-white ${section === item ? 'active' : ''}`} onClick={() => { setSection(item); setMobileMenuOpen(false); }}>{item === 'food' ? 'Food Court Menus' : item[0].toUpperCase() + item.slice(1)}</a>)}
      </nav>
    </header>
    <main className={section === 'map' ? 'map-page' : 'container py-4'}>
      {section === 'map' && <div className="row g-0 h-100">
        <aside className="col-12 col-lg-4 p-3 border-end overflow-visible bg-white">
          {!navigationPanelOpen && <>
            {!selected && !directions && navigation !== 'calculating' && <><label className="form-label" htmlFor="store-search">Store directory</label>
              <div className="position-relative">
                <input id="store-search" className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stores" aria-expanded={Boolean(normalize(search))} aria-controls="store-results" />
                {normalize(search) && <div id="store-results" className="list-group position-absolute w-100 search-results">
                  {searchResults.map((store) => <button key={store.id} className={`list-group-item list-group-item-action ${selectedId === store.id ? 'active' : ''}`} onClick={() => selectStore(store.id)}>{store.name}</button>)}
                  {!searchResults.length && <p className="text-secondary p-2 mb-0">No stores match that search.</p>}
                </div>}
              </div></>}
            {navigation === 'loading' && <p className="small text-secondary mt-2">Loading map and directory…</p>}
            {selected && <section className="mt-3"><h5>{selected.name}</h5><p className="text-secondary small">Main level storefront</p>
              {navigation === 'preview' ? <div className="btn-group w-100">
                <button className="btn btn-success" onClick={startNavigation}>Start</button>
                <button className="btn btn-outline-secondary" onClick={returnToSearch}>Return to search</button>
              </div> : navigation === 'calculating' ? <button className="btn btn-success w-100" disabled>Finding route…</button> : null}
              {!startPoint && <p className="small text-secondary mt-2 mb-0">Tap a map space to set the starting point.</p>}
              {navigation === 'selected' && <button className="btn btn-link p-0 mt-2" onClick={returnToSearch}>Return to search</button>}
            </section>}
          </>}
          {navigationPanelOpen && <section><h5>Directions to {selected?.name}</h5>
            {navigation === 'calculating' && <p className="text-secondary">Calculating route…</p>}
            {directions && <><p className="small text-secondary mb-1">Step {instructionIndex + 1} of {directions.instructions.length}</p>
              <p className="fs-5">{instructionText(directions)[instructionIndex]}</p>
              <div className="btn-group mb-3 w-100" aria-label="Direction steps">
                <button className="btn btn-outline-secondary" disabled={instructionIndex === 0} onClick={() => setInstructionIndex((index) => index - 1)}>Previous</button>
                {navigation === 'preview' && <button className="btn btn-primary" onClick={() => setAction('simulate')}>Start</button>}
                {navigation === 'simulating' && <button className="btn btn-primary" onClick={() => setAction('pause')}>Pause</button>}
                {navigation === 'paused' && <button className="btn btn-primary" onClick={() => setAction('simulate')}>Resume</button>}
                {navigation === 'arrived' && <button className="btn btn-success" onClick={resetNavigation}>Done</button>}
                <button className="btn btn-outline-secondary" disabled={instructionIndex >= directions.instructions.length - 1} onClick={() => setInstructionIndex((index) => index + 1)}>Next</button>
              </div>
              {navigation !== 'arrived' && <button className="btn btn-link p-0" onClick={resetNavigation}>Cancel route</button>}
            </>}
            {navigation === 'error' && <button className="btn btn-link" onClick={resetNavigation}>Cancel route</button>}
          </section>}
        </aside>
        <section className="col-12 col-lg-8 map-column"><MapCanvas selectedStoreId={selectedId} startSpaceId={startPoint?.id} routeTargetId={routeTargetId} cameraMode={cameraMode} action={action} onReady={setStores} onStartSelection={(id, name) => { setStartPoint({ id, name, floorId: mallConfig.mainFloorId }); setRouteTargetId(selectedId); setLocationToast('open'); setDirections(undefined); setInstructionIndex(0); setAction(''); }} onInstructionChange={setInstructionIndex} onState={(state, route) => { setNavigation(state); if (route) setDirections(route); }} onMessage={(notice) => { setMessage(notice); if (notice) setLocationToast('open'); }} /></section>
      </div>}
      {section === 'sales' && <section><p className="text-success fw-semibold">Sample/demo content</p><h2>Sales</h2>{content(sales, (sale) => <article key={sale.id} className="col-md-6"><div className="card h-100"><div className="card-body"><h5>{sale.title}</h5><p>{sale.description}</p><p className="small text-secondary">{sale.validFrom}–{sale.validUntil}</p>{sale.storeName && <button className="btn btn-outline-success btn-sm" onClick={() => findOnMap(sale.storeName)}>Find on map</button>}</div></div></article>)}</section>}
      {section === 'food' && <section><p className="text-success fw-semibold">Sample/demo content</p><h2>Food Court Menus</h2>{content(food, (vendor) => <article key={vendor.id} className="col-md-6"><div className="card h-100"><div className="card-body"><h5>{vendor.name}</h5><ul className="list-group list-group-flush mb-3">{vendor.menu.map((item) => <li key={item.id} className="list-group-item px-0">{item.name} — {(item.priceMinor / 100).toLocaleString('en-CA', { style: 'currency', currency: item.currency })}<small className="d-block text-secondary">{item.description}</small></li>)}</ul>{vendor.storeName && <button className="btn btn-outline-success btn-sm" onClick={() => findOnMap(vendor.storeName)}>Find on map</button>}</div></div></article>)}</section>}
      {section === 'events' && <section><p className="text-success fw-semibold">Sample/demo content</p><h2>Events</h2>{content(events, (event) => <article key={event.id} className="col-md-6"><div className="card h-100"><div className="card-body"><h5>{event.title}</h5><p>{event.description}</p><p className="small text-secondary">{event.location} · {new Date(event.startsAt).toLocaleString()}</p>{event.storeName && <button className="btn btn-outline-success btn-sm" onClick={() => findOnMap(event.storeName)}>Find on map</button>}</div></div></article>)}</section>}
    </main>
    {(startPoint || message) && locationToast !== 'dismissed' && <aside className="position-fixed bottom-0 end-0 p-3 location-toast" role="status" aria-live="polite">
      {locationToast === 'open' ? <div className="toast show border-success" role="alert">
        <div className="toast-header">
          <strong className="me-auto">Demo status</strong>
          <button type="button" className="btn btn-sm btn-link" onClick={() => setLocationToast('minimized')}>Minimize</button>
          <button type="button" className="btn-close ms-2" aria-label="Dismiss demo status" onClick={() => setLocationToast('dismissed')} />
        </div>
        <div className="toast-body">
          <p className="mb-1 small text-secondary">Demo venue · Main level</p>
          {startPoint && <p className="mb-1">Simulated location: <strong>{startPoint.name}</strong>.</p>}
          {message && <p className={`mb-0 ${navigation === 'error' ? 'text-danger' : ''}`}>{message}</p>}
          {directions && <div className="border-top mt-2 pt-2">
            <p className="small text-secondary mb-1">Navigation camera</p>
            <div className="btn-group btn-group-sm w-100" aria-label="Navigation camera">
              <button className={`btn btn-outline-primary ${cameraMode === 'follow' ? 'active' : ''}`} onClick={() => setCameraMode('follow')}>Follow</button>
              <button className={`btn btn-outline-primary ${cameraMode === 'float' ? 'active' : ''}`} onClick={() => setCameraMode('float')}>Float</button>
            </div>
          </div>}
        </div>
      </div> : <button className="btn btn-success shadow-sm" onClick={() => setLocationToast('open')}>Show demo status</button>}
    </aside>}
  </div>;
}
