import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BlueDot } from '@mappedin/blue-dot';
import { DOORS, getMapData, show3dMap } from '@mappedin/mappedin-js';
import type { Coordinate, Directions, Label, Marker, Space } from '@mappedin/mappedin-js';
import { hasMapCredentials, mallConfig } from './config/mall';
import { mockContentService } from './services/mockContent';
import type { FoodVendor, MallEvent, Sale } from './services/content';
import { mainLevelStorefronts } from './services/storefronts';

type Section = 'map' | 'sales' | 'food' | 'events';
type DirectoryMode = 'search' | 'browse';
type Store = { id: string; name: string; floorId: string };
type RouteOrigin = { kind: 'space'; spaceId: string } | { kind: 'current-location'; coordinate: Coordinate };
type DirectoryCategory = 'Stores' | 'Restrooms' | 'Parking' | 'Entrances & exits' | 'Vertical access' | 'Accessible routes' | 'Other spaces';
type DirectorySpace = Store & { category: DirectoryCategory; isStore: boolean };
type DirectoryPayload = { stores: Store[]; namedSpaces: DirectorySpace[] };
type NavigationState = 'loading' | 'idle' | 'selected' | 'calculating' | 'preview' | 'simulating' | 'paused' | 'arrived' | 'error';
type SimulationCameraMode = 'follow' | 'float';
type LocationToastState = 'open' | 'minimized' | 'dismissed';
type MapRuntime = {
  mapData: Awaited<ReturnType<typeof getMapData>>;
  mapView: Awaited<ReturnType<typeof show3dMap>>;
  blueDot: BlueDot;
  spaces: Space[];
  stores: Space[];
  labels: Record<string, Label>;
  promotionMarkers: Map<string, Marker>;
  highlightedPromotions: Set<string>;
};
const directoryCategories: readonly DirectoryCategory[] = ['Stores', 'Restrooms', 'Parking', 'Entrances & exits', 'Vertical access', 'Accessible routes', 'Other spaces'];
const storefrontIds = new Set(mainLevelStorefronts.map((store) => store.id));
const DEMO_CLEAR_SAVED_PARKING_ON_RELOAD = true;

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isParking = (name: string) => /\bparking\b/i.test(name);
const isStore = (space: Space) => storefrontIds.has(space.id);
const defaultStartSpaceId = 's_652062634c59296984d6ccca';
const savedParkingStorageKey = 'greenfield-demo-saved-parking';
const categoryFor = (name: string, store: boolean): DirectoryCategory => {
  if (store) return 'Stores';
  if (/\b(restroom|washroom|toilet)\b/i.test(name)) return 'Restrooms';
  if (/\bparking\b/i.test(name)) return 'Parking';
  if (/\b(entrance|exit)\b/i.test(name)) return 'Entrances & exits';
  if (/\b(stairs?|escalator|elevator|lift)\b/i.test(name)) return 'Vertical access';
  if (/\b(ramp|accessible|accessibility)\b/i.test(name)) return 'Accessible routes';
  return 'Other spaces';
};
const isSavedParking = (value: unknown): value is Store =>
  typeof value === 'object' && value !== null
  && ['id', 'name', 'floorId'].every((field) => {
    const candidate = Reflect.get(value, field);
    return typeof candidate === 'string' && Boolean(candidate.trim());
  });
const readSavedParking = (): Store | undefined => {
  try {
    if (DEMO_CLEAR_SAVED_PARKING_ON_RELOAD && performance.getEntriesByType('navigation')
      .some((entry) => entry instanceof PerformanceNavigationTiming && entry.type === 'reload')) {
      localStorage.removeItem(savedParkingStorageKey);
      return undefined;
    }
    const parsed: unknown = JSON.parse(localStorage.getItem(savedParkingStorageKey) ?? 'null');
    if (isSavedParking(parsed)) return parsed;
    localStorage.removeItem(savedParkingStorageKey);
    return undefined;
  } catch {
    try {
      localStorage.removeItem(savedParkingStorageKey);
    } catch {
      // Storage is unavailable.
    }
    return undefined;
  }
};
const instructionText = (direction: Directions) =>
  direction.instructions.map((instruction) => {
    const action = instruction.action.type.replace(/[_-]/g, ' ').toLocaleLowerCase();
    return `${action.charAt(0).toUpperCase()}${action.slice(1)}${instruction.distance ? ` for ${Math.round(instruction.distance)} m` : ''}`;
  });
const formatPromotionDate = (value: string) =>
  new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`));

function MapCanvas({
  selectedStoreId, routeOrigin, routeTargetId, cameraMode, action, onReady, onStartSelection, onRouteOriginChange, onInstructionChange, onState, onMessage,
  promotions, onArrival, onLocationAvailable, focusedSpaceId, focusSequence,
}: {
  selectedStoreId?: string; routeOrigin?: RouteOrigin; routeTargetId?: string; cameraMode: SimulationCameraMode; action: string;
  onReady: (directory: DirectoryPayload) => void; onStartSelection: (id: string, name: string) => void;
  onRouteOriginChange: (origin: RouteOrigin, name: string) => void;
  onInstructionChange: (index: number) => void;
  onState: (state: NavigationState, directions?: Directions) => void; onMessage: (message?: string) => void;
  promotions: Sale[]; onArrival: (spaceId: string, coordinate: Coordinate) => void; onLocationAvailable: (available: boolean) => void; focusedSpaceId?: string; focusSequence: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<MapRuntime | undefined>(undefined);
  const route = useRef<Directions | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const routeToken = useRef(0);
  const simulationIndex = useRef(0);
  const highlightedDestination = useRef<Space | undefined>(undefined);
  const highlightTimer = useRef<number | undefined>(undefined);
  const highlightToken = useRef(0);
  const nearbyPromotionToken = useRef(0);
  const lastCoordinate = useRef<Coordinate | undefined>(undefined);
  const instructionCoordinateIndexes = useRef<number[]>([]);
  const hasMovedSinceRouteStarted = useRef(false);
  const onStartSelectionRef = useRef(onStartSelection);
  const promotionsRef = useRef(promotions);
  const focusedSpaceIdRef = useRef(focusedSpaceId);
  const routeOriginRef = useRef(routeOrigin);
  const [mapReady, setMapReady] = useState(false);
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character] ?? character));
  const setSimulationCamera = (mode: SimulationCameraMode) => {
    runtime.current?.blueDot.follow(
      mode === 'follow' ? 'position-and-path-direction' : 'position-only',
      mode === 'follow'
        ? { zoomLevel: 20, pitch: 45, duration: 500 }
        : { zoomLevel: 17, pitch: 0, bearing: 0, duration: 500 },
    );
  };
  const focusSimulationCoordinate = (coordinate: Coordinate, mode: SimulationCameraMode) => {
    void runtime.current?.mapView.Camera.focusOn(coordinate, mode === 'follow'
      ? { minZoomLevel: 20, maxZoomLevel: 20, pitch: 45, duration: 500 }
      : { minZoomLevel: 17, maxZoomLevel: 17, pitch: 0, bearing: 0, duration: 500 });
  };
  const findSpace = (spaceId?: string) => runtime.current?.spaces.find((space) => space.id === spaceId);
  const routeOriginTarget = (origin?: RouteOrigin) =>
    origin?.kind === 'current-location' ? origin.coordinate : findSpace(origin?.spaceId);
  const enableBlueDot = () => {
    runtime.current?.blueDot.enable({ watchDevicePosition: false, preventOutOfBounds: false, accuracyThreshold: 50 });
  };
  const updateBlueDot = (coordinate: Coordinate, animate: boolean, fallbackFloorId?: string) => {
    const blueDot = runtime.current?.blueDot;
    if (!blueDot) return;
    enableBlueDot();
    blueDot.update({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      floorOrFloorId: coordinate.floorId ?? fallbackFloorId,
      accuracy: 0,
    }, { animate });
  };

  const pauseSimulation = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = undefined;
    runtime.current?.blueDot.follow(false);
  };
  const stop = () => {
    pauseSimulation();
    runtime.current?.blueDot.disable();
  };
  const clearNearbyPromotions = () => {
    const current = runtime.current;
    if (!current) return;
    current.highlightedPromotions.forEach((spaceId) => {
      const store = current.stores.find((item) => item.id === spaceId);
      if (store) current.mapView.updateState(store, { height: undefined });
    });
    current.highlightedPromotions.clear();
    current.promotionMarkers.forEach((marker) => current.mapView.Markers.remove(marker));
    current.promotionMarkers.clear();
  };
  const updateNearbyPromotions = (coordinate: Coordinate) => {
    const current = runtime.current;
    const nearbyToken = ++nearbyPromotionToken.current;
    const promotionBySpaceId = new Map(promotionsRef.current.map((promotion) => [promotion.spaceId, promotion]));
    const promotionSpaces = current?.stores.filter((store) => promotionBySpaceId.has(store.id)) ?? [];
    if (!current || !promotionSpaces.length) return;
    void current.mapData.Query.nearest(coordinate, promotionSpaces, {
      mode: 'travel-distance', maxDistance: 35, maxResults: 4, limit: 'same-floor',
    }).then((results) => {
      if (nearbyToken !== nearbyPromotionToken.current || runtime.current !== current) return;
      const nearbyIds = new Set((results ?? []).map((result) => result.feature.id));
      promotionSpaces.forEach((space) => {
        const promotion = promotionBySpaceId.get(space.id);
        if (!promotion) return;
        if (nearbyIds.has(space.id)) {
          if (!current.promotionMarkers.has(space.id)) {
            const marker = current.mapView.Markers.add(
              space,
              `<div class="badge text-bg-success shadow-sm">${escapeHtml(promotion.offer)}</div>`,
              { placement: 'top', rank: 'always-visible' },
            );
            current.promotionMarkers.set(space.id, marker);
          }
          if (!current.highlightedPromotions.has(space.id)) {
            current.highlightedPromotions.add(space.id);
            current.mapView.updateState(space, { height: 1 });
          }
        } else {
          if (current.highlightedPromotions.delete(space.id)) current.mapView.updateState(space, { height: undefined });
          const marker = current.promotionMarkers.get(space.id);
          if (marker) {
            current.mapView.Markers.remove(marker);
            current.promotionMarkers.delete(space.id);
          }
        }
      });
    }).catch(() => undefined);
  };
  const reset = (origin = routeOrigin, focusOrigin = true) => {
    pauseSimulation();
    routeToken.current += 1;
    clearNearbyPromotions();
    route.current = undefined;
    simulationIndex.current = 0;
    void runtime.current?.mapView.Navigation.clear();
    const startingTarget = routeOriginTarget(origin);
    if (focusOrigin && startingTarget) void runtime.current?.mapView.Camera.focusOn(startingTarget, { pitch: 0, bearing: 0, duration: 700 });
    onState(selectedStoreId ? 'selected' : 'idle');
    onMessage();
  };
  const focusSpace = (spaceId: string) => {
    const current = runtime.current;
    const target = findSpace(spaceId);
    if (!current || !target) {
      if (current) onMessage('That saved location is no longer available on this map.');
      return;
    }
    void current.mapView.Camera.focusOn(target, { pitch: 0, bearing: 0, duration: 700 });
    onMessage(`Showing ${target.name?.trim() || 'the selected space'}.`);
  };

  useEffect(() => {
    onStartSelectionRef.current = onStartSelection;
  }, [onStartSelection]);

  useEffect(() => {
    focusedSpaceIdRef.current = focusedSpaceId;
  }, [focusedSpaceId, focusSequence]);

  useEffect(() => {
    routeOriginRef.current = routeOrigin;
  }, [routeOrigin]);

  useEffect(() => {
    promotionsRef.current = promotions;
    if (lastCoordinate.current) updateNearbyPromotions(lastCoordinate.current);
  }, [promotions]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        if (!hasMapCredentials) throw new Error('Map credentials are not configured. Set VITE_MAPPEDIN_KEY and VITE_MAPPEDIN_SECRET.');
        const mapData = await getMapData(mallConfig.credentials);
        if (disposed || !containerRef.current) return;
        const mapView = await show3dMap(containerRef.current, mapData);
        if (disposed) return;
        const spaces = mapData.getByType('space');
        const namedSpaces = spaces
          .filter((space) => space.floor?.id === mallConfig.mainFloorId && Boolean(space.name?.trim()));
        const stores = namedSpaces.filter(isStore);
        const labels: Record<string, Label> = {};
        spaces.forEach((space) => {
          mapView.updateState(space, { interactive: Boolean(space.name) });
          if (space.name?.trim()) {
            labels[space.id] = mapView.Labels.add(space, space.name, { interactive: true });
            mapView.updateState(labels[space.id], { enabled: true });
          }
        });
        mapView.updateState(DOORS.Interior, { visible: true });
        mapView.updateState(DOORS.Exterior, { visible: true, color: 'black' });
        runtime.current = {
          mapData, mapView, blueDot: new BlueDot(mapView), spaces, stores, labels,
          promotionMarkers: new Map(), highlightedPromotions: new Set(),
        };
        setMapReady(true);
        if (focusedSpaceIdRef.current) focusSpace(focusedSpaceIdRef.current);
        const existingOrigin = routeOriginRef.current;
        const defaultStart = existingOrigin
          ? undefined
          : spaces.find((space) => space.id === defaultStartSpaceId);
        const initialCoordinate = existingOrigin?.kind === 'current-location'
          ? existingOrigin.coordinate
          : existingOrigin?.kind === 'space'
            ? spaces.find((space) => space.id === existingOrigin.spaceId)?.anchorTarget
            : defaultStart?.anchorTarget;
        if (initialCoordinate) {
          const coordinate = initialCoordinate;
          lastCoordinate.current = coordinate;
          updateBlueDot(coordinate, false, defaultStart?.floor?.id);
          onLocationAvailable(true);
        }
        if (defaultStart) {
          onStartSelectionRef.current(defaultStart.id, defaultStart.name?.trim() || 'Parking Lot B');
          onRouteOriginChange({ kind: 'space', spaceId: defaultStart.id }, defaultStart.name?.trim() || 'Parking Lot B');
        }
        onReady({
          stores: stores.map((space) => ({ id: space.id, name: space.name, floorId: mallConfig.mainFloorId })),
          namedSpaces: namedSpaces.map((space) => {
            const name = space.name.trim();
            const store = isStore(space);
            return { id: space.id, name, floorId: mallConfig.mainFloorId, isStore: store, category: categoryFor(name, store) };
          }).sort((left, right) => left.name.localeCompare(right.name)),
        });
        onState(existingOrigin || defaultStart ? 'selected' : 'idle');
        mapView.on('click', (event) => {
          const target = event?.spaces?.[0];
          if (!target) return;
          pauseSimulation();
          route.current = undefined;
          simulationIndex.current = 0;
          const coordinate = target.anchorTarget;
          lastCoordinate.current = coordinate;
          onLocationAvailable(true);
          updateBlueDot(coordinate, true, target.floor?.id);
          updateNearbyPromotions(coordinate);
          void mapView.Navigation.clear();
          onStartSelectionRef.current(target.id, target.name?.trim() || 'Selected map point');
          onRouteOriginChange({ kind: 'space', spaceId: target.id }, target.name?.trim() || 'Selected map point');
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
      nearbyPromotionToken.current += 1;
      if (highlightTimer.current) window.clearInterval(highlightTimer.current);
      stop();
      clearNearbyPromotions();
      void runtime.current?.mapView.Navigation.clear();
    };
  }, []);

  useEffect(() => {
    const current = runtime.current;
    const target = findSpace(selectedStoreId);
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
        current.spaces.filter((space) => space.floor?.id === mallConfig.mainFloorId),
        { pitch: 0, bearing: 0, duration: 1400 },
      ).then(() => {
        if (token !== highlightToken.current) return;
        blink();
        highlightTimer.current = window.setInterval(blink, 750);
      });
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (!focusedSpaceId) return;
    focusSpace(focusedSpaceId);
  }, [focusedSpaceId]);

  useEffect(() => {
    if (timer.current) setSimulationCamera(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    const current = runtime.current;
    if (!current || !routeTargetId || !routeOrigin) return;
    const destination = findSpace(routeTargetId);
    const origin = routeOriginTarget(routeOrigin);
    if (!destination || !origin) return;
    const token = ++routeToken.current;
    pauseSimulation();
    route.current = undefined;
    instructionCoordinateIndexes.current = [];
    hasMovedSinceRouteStarted.current = false;
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
        instructionCoordinateIndexes.current = directions.instructions.map((instruction) =>
          directions.coordinates.reduce((nearestIndex, coordinate, index, coordinates) => {
            const nearest = coordinates[nearestIndex];
            const distance = (coordinate.latitude - instruction.coordinate.latitude) ** 2 + (coordinate.longitude - instruction.coordinate.longitude) ** 2;
            const nearestDistance = (nearest.latitude - instruction.coordinate.latitude) ** 2 + (nearest.longitude - instruction.coordinate.longitude) ** 2;
            return distance < nearestDistance ? index : nearestIndex;
          }, 0),
        );
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
  }, [routeTargetId, routeOrigin, mapReady]);

  useEffect(() => {
    const current = runtime.current;
    if (!current) return;
    if (action.startsWith('cancel-') || action.startsWith('done-')) {
      if (action.startsWith('cancel-') && (hasMovedSinceRouteStarted.current || simulationIndex.current > 0) && lastCoordinate.current) {
        const currentLocationOrigin = { kind: 'current-location' as const, coordinate: lastCoordinate.current };
        onRouteOriginChange(currentLocationOrigin, 'Current simulated location');
        reset(currentLocationOrigin, false);
      } else {
        reset(undefined, false);
      }
      return;
    }
    if (action.startsWith('clear-route-')) {
      pauseSimulation();
      if ((hasMovedSinceRouteStarted.current || simulationIndex.current > 0) && lastCoordinate.current) {
        onRouteOriginChange({ kind: 'current-location', coordinate: lastCoordinate.current }, 'Current simulated location');
      }
      route.current = undefined;
      instructionCoordinateIndexes.current = [];
      simulationIndex.current = 0;
      void current.mapView.Navigation.clear();
      onState('idle');
      onMessage();
      return;
    }
    if (action.startsWith('where-am-i-')) {
      const coordinate = lastCoordinate.current;
      if (!coordinate) {
        onMessage('Choose a starting point on the map before using Where am I?.');
      } else {
        updateBlueDot(coordinate, true);
        current.blueDot.follow('position-only', { zoomLevel: 17, pitch: 0, bearing: 0, duration: 500 });
        updateNearbyPromotions(coordinate);
        onMessage('Centered on your simulated location.');
      }
      return;
    }
    if (action.startsWith('follow-') && route.current) {
      setSimulationCamera('follow');
      return;
    }
    const manualStep = /^step-(\d+)-/.exec(action);
    if (manualStep && route.current) {
      const instructionIndex = Number(manualStep[1]);
      const coordinateIndex = instructionCoordinateIndexes.current[instructionIndex];
      const coordinate = route.current.coordinates[coordinateIndex];
      if (!coordinate) return;
      const wasSimulating = timer.current !== undefined;
      pauseSimulation();
      lastCoordinate.current = coordinate;
      simulationIndex.current = Math.min(coordinateIndex + 1, route.current.coordinates.length - 1);
      hasMovedSinceRouteStarted.current ||= coordinateIndex > 0;
      updateBlueDot(coordinate, true);
      current.mapView.Navigation.trackCoordinate(coordinate, { mode: 'travelled' });
      updateNearbyPromotions(coordinate);
      focusSimulationCoordinate(coordinate, cameraMode);
      onInstructionChange(instructionIndex);
      if (wasSimulating) onState('paused', route.current);
      return;
    }
    if (action.startsWith('simulate-') && route.current) {
      const directions = route.current;
      pauseSimulation();
      let index = simulationIndex.current;
      enableBlueDot();
      setSimulationCamera(cameraMode);
      onState('simulating', directions);
      const advance = () => {
        const coordinate = directions.coordinates[index];
        if (!coordinate) return;
        lastCoordinate.current = coordinate;
        hasMovedSinceRouteStarted.current ||= index > 0;
        onLocationAvailable(true);
        updateBlueDot(coordinate, true);
        runtime.current?.mapView.Navigation.trackCoordinate(coordinate, { mode: 'travelled' });
        updateNearbyPromotions(coordinate);
        onInstructionChange(instructionCoordinateIndexes.current.reduce((activeInstruction, instructionCoordinateIndex, instructionIndex) =>
          instructionCoordinateIndex <= index ? instructionIndex : activeInstruction, 0));
        if (index >= directions.coordinates.length - 1) {
          pauseSimulation();
          onState('arrived', directions);
          onMessage('Simulated arrival. You have reached your destination.');
          const destination = findSpace(routeTargetId);
          if (destination) {
            const arrivalToken = routeToken.current;
            void current.mapView.Camera.focusOn(destination, { pitch: 0, bearing: 0, duration: 800 })
              .finally(() => {
                if (arrivalToken === routeToken.current) onArrival(destination.id, coordinate);
              });
          }
          return;
        }
        index += 1;
        simulationIndex.current = index;
      };
      advance();
      if (timer.current === undefined && index < directions.coordinates.length - 1) timer.current = window.setInterval(advance, 700);
      return;
    }
    if (action.startsWith('pause-') && timer.current) {
      pauseSimulation();
      onState('paused', route.current);
    }
  }, [action]);

  return <div ref={containerRef} className="mappedin-map" aria-label="Interactive Greenfield Mall map" />;
}

function useContent<T>(resource: string, query: () => Promise<T[]>) {
  return useQuery({ queryKey: ['mall', mallConfig.propertyId, resource], queryFn: query, staleTime: Infinity, retry: false, refetchOnWindowFocus: false });
}

function DirectoryPills({ mode, onChange }: { mode: DirectoryMode; onChange: (mode: DirectoryMode) => void }) {
  return <nav className="d-flex align-items-center mb-3" aria-label="Directory">
    <span className="small fw-semibold me-2">Directory:</span>
    <div className="nav nav-pills d-inline-flex">
      <button type="button" className={`nav-link py-1 px-2 ${mode === 'search' ? 'active' : ''}`} onClick={() => onChange('search')}>Search</button>
      <button type="button" className={`nav-link py-1 px-2 ${mode === 'browse' ? 'active' : ''}`} onClick={() => onChange('browse')}>Browse</button>
    </div>
  </nav>;
}

export default function App() {
  const [section, setSection] = useState<Section>('map');
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>('search');
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
  const [cameraMode, setCameraMode] = useState<SimulationCameraMode>('follow');
  const [locationToast, setLocationToast] = useState<LocationToastState>('open');
  const [action, setAction] = useState('');
  const actionSequence = useRef(0);
  const dispatchAction = (name: string) => setAction(`${name}-${++actionSequence.current}`);
  const [navigation, setNavigation] = useState<NavigationState>('loading');
  const [directions, setDirections] = useState<Directions>();
  const [instructionIndex, setInstructionIndex] = useState(0);
  const [message, setMessage] = useState<string>();
  const [search, setSearch] = useState('');
  const [promotionSearch, setPromotionSearch] = useState('');
  const [hasLocation, setHasLocation] = useState(false);
  const [arrivalPromotionSpaceId, setArrivalPromotionSpaceId] = useState<string>();
  const promotionDialogRef = useRef<HTMLDivElement>(null);
  const sales = useContent<Sale>('sales', () => mockContentService.listSales(mallConfig.propertyId));
  const food = useContent<FoodVendor>('food', () => mockContentService.listFoodVendors(mallConfig.propertyId));
  const events = useContent<MallEvent>('events', () => mockContentService.listEvents(mallConfig.propertyId));
  const searchResults = useMemo(() => {
    const query = normalize(search);
    if (!query) return [];
    const match = new RegExp(escapeRegex(query), 'i');
    const startsWith = new RegExp(`^${escapeRegex(query)}`, 'i');
    return directorySpaces
      .filter((space) => match.test(normalize(space.name)))
      .sort((left, right) => {
        const leftStarts = startsWith.test(normalize(left.name));
        const rightStarts = startsWith.test(normalize(right.name));
        return leftStarts === rightStarts ? left.name.localeCompare(right.name) : leftStarts ? -1 : 1;
      });
  }, [directorySpaces, search]);
  const filteredPromotions = useMemo(() => {
    const query = normalize(promotionSearch);
    if (!query) return sales.data ?? [];
    return (sales.data ?? []).filter((promotion) =>
      Object.values(promotion).some((value) => normalize(value).includes(query)));
  }, [promotionSearch, sales.data]);
  const directoryGroups = useMemo(() => directoryCategories
    .map((category) => ({ category, spaces: directorySpaces.filter((space) => space.category === category) }))
    .filter((group) => group.spaces.length > 0), [directorySpaces]);
  const selected = directorySpaces.find((space) => space.id === selectedId);
  const arrivalPromotions = sales.data?.filter((promotion) => promotion.spaceId === arrivalPromotionSpaceId) ?? [];
  const arrivalStore = stores.find((store) => store.id === arrivalPromotionSpaceId);
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
      if (event.key !== 'Escape') return;
      if (arrivalPromotionSpaceId) setArrivalPromotionSpaceId(undefined);
      else closeMobileMenu();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [arrivalPromotionSpaceId, mobileMenuOpen, mobileMenuClosing]);
  useEffect(() => {
    if (arrivalPromotionSpaceId) promotionDialogRef.current?.focus();
  }, [arrivalPromotionSpaceId]);
  const selectStore = (id: string) => { setSearch(''); setSelectedId(id); setFocusedSpaceId(undefined); setRouteTargetId(routeOrigin ? id : undefined); setDirections(undefined); setAction(''); setNavigation(routeOrigin ? 'calculating' : 'selected'); setMessage(undefined); setDirectoryMode('search'); setSection('map'); };
  const focusSpace = (space: DirectorySpace | Store) => {
    if ('isStore' in space) {
      selectStore(space.id);
      return;
    }
    setSelectedId(undefined);
    setRouteTargetId(undefined);
    setDirections(undefined);
    setFocusedSpaceId(space.id);
    setFocusSequence((sequence) => sequence + 1);
    setNavigation('idle');
    setDirectoryMode('search');
    setSection('map');
  };
  const saveParking = () => {
    if (!parkingOffer) return;
    try {
      localStorage.setItem(savedParkingStorageKey, JSON.stringify(parkingOffer));
      setSavedParking(parkingOffer);
      setParkingOffer(undefined);
    } catch {
      setMessage('Parking could not be saved in this browser.');
      setLocationToast('open');
    }
  };
  const removeSavedParking = () => {
    try {
      localStorage.removeItem(savedParkingStorageKey);
    } catch {
      // Storage can be unavailable in private browsing.
    }
    setSavedParking(undefined);
  };
  const startNavigation = () => {
    if (!selectedId || !directions || navigation !== 'preview') return;
    if (!routeOrigin) {
      setMessage('Select a starting point on the map before starting navigation.');
      setLocationToast('open');
      return;
    }
    setNavigationPanelOpen(true);
    dispatchAction('follow');
  };
  const resetNavigation = (completed = false) => {
    dispatchAction(completed ? 'done' : 'cancel');
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
    dispatchAction('clear-route');
    setSelectedId(undefined);
    setRouteTargetId(undefined);
    setDirections(undefined);
    setInstructionIndex(0);
    setNavigation('idle');
    setSearch('');
  };
  const findOnMap = (name?: string) => { const store = stores.find((item) => normalize(item.name) === normalize(name ?? '')); if (store) selectStore(store.id); };
  const content = <T extends { id: string; title?: string; name?: string; description?: string; storeName?: string }>(result: ReturnType<typeof useContent<T>>, render: (item: T) => ReactElement, items = result.data, emptyMessage = 'No sample content is available.') => {
    if (result.isPending) return <p className="text-secondary">Loading sample content…</p>;
    if (result.isError) return <div className="alert alert-danger">Sample content could not be loaded. <button className="btn btn-link p-0" onClick={() => void result.refetch()}>Retry</button></div>;
    if (!items?.length) return <p className="text-secondary">{emptyMessage}</p>;
    return <div className="row g-3">{items.map(render)}</div>;
  };

  return <div className="app-shell">
    <header className="navbar navbar-expand-md navbar-dark bg-primary fixed-top px-3 px-md-4">
      <a className="navbar-brand fw-bold" href="#map" onClick={() => setSection('map')}>Greenfield Mall Group</a>
      <button className="navbar-toggler d-md-none" type="button" aria-controls="mobile-primary-navigation" aria-expanded={mobileMenuOpen} aria-label="Toggle navigation" onClick={() => mobileMenuOpen ? closeMobileMenu() : openMobileMenu()}>
        <span className="navbar-toggler-icon" />
      </button>
      <nav className="d-none d-md-flex flex-row ms-auto" aria-label="Primary navigation">
        {(['map', 'sales', 'food', 'events'] as Section[]).map((item) => <a key={item} href={`#${item}`} className={`nav-link px-2 text-white ${section === item ? 'active' : ''}`} onClick={() => setSection(item)}>{item === 'sales' ? 'Promotions' : item === 'food' ? 'Food Court Menus' : item[0].toUpperCase() + item.slice(1)}</a>)}
      </nav>
    </header>
    {mobileMenuOpen && <>
      <div className={`offcanvas-backdrop fade show mobile-nav-backdrop ${mobileMenuClosing ? 'mobile-nav-backdrop--closing' : ''}`} onClick={closeMobileMenu} aria-hidden="true" />
      <nav id="mobile-primary-navigation" className={`offcanvas offcanvas-end show mobile-navigation-drawer ${mobileMenuClosing ? 'mobile-navigation-drawer--closing' : ''}`} role="dialog" aria-modal="true" aria-hidden={mobileMenuClosing} aria-label="Primary navigation">
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h5">Navigation</h2>
          <button type="button" className="btn-close me-3" aria-label="Close navigation" onClick={closeMobileMenu} />
        </div>
        <div className="offcanvas-body">
          {(['map', 'sales', 'food', 'events'] as Section[]).map((item) => <a key={item} href={`#${item}`} className={`nav-link py-2 ${section === item ? 'active fw-semibold' : ''}`} onClick={() => { setSection(item); closeMobileMenu(); }}>{item === 'sales' ? 'Promotions' : item === 'food' ? 'Food Court Menus' : item[0].toUpperCase() + item.slice(1)}</a>)}
        </div>
      </nav>
    </>}
    <main className={`app-main ${section === 'map' ? `map-page ${directoryMode === 'browse' ? 'directory-page' : ''}` : `content-page content-page--${section}`}`}>
      {section === 'map' && directoryMode === 'browse' && <section className="directory-panel container-fluid px-3 py-3">
        <div className="mx-auto directory-content">
          <DirectoryPills mode={directoryMode} onChange={setDirectoryMode} />
          <h1 className="h3">Directory</h1>
          <p className="text-secondary">All named spaces on the main level.</p>
          <div className="directory-list">
            {directoryGroups.map((group) => <section key={group.category} className="mb-4" aria-labelledby={`directory-${group.category}`}>
              <h2 id={`directory-${group.category}`} className="h5">{group.category} <span className="text-secondary">({group.spaces.length})</span></h2>
              <div className="list-group">
                {group.spaces.map((space) => <button key={space.id} type="button" className="list-group-item list-group-item-action text-start" onClick={() => focusSpace(space)} aria-label={`Select ${space.name} as your destination`}>
                  {space.name}
                </button>)}
              </div>
            </section>)}
          </div>
        </div>
      </section>}
      {section === 'map' && directoryMode === 'search' && <div className="row g-0 h-100">
        <aside className="col-12 col-lg-4 p-3 border-end overflow-visible bg-white">
          {!navigationPanelOpen && <>
            <DirectoryPills mode={directoryMode} onChange={setDirectoryMode} />
            {savedParking && <div className="alert alert-success py-2 small d-flex align-items-center gap-2" role="status">
              <span className="flex-grow-1">Saved parking: <strong>{savedParking.name}</strong></span>
              <button type="button" className="btn btn-success btn-sm" onClick={() => focusSpace(savedParking)}>Show saved parking</button>
              <button type="button" className="btn btn-outline-success btn-sm" onClick={removeSavedParking} aria-label="Remove saved parking">Remove</button>
            </div>}
            {!selected && !directions && navigation !== 'calculating' && <><label className="visually-hidden" htmlFor="store-search">Find anything</label>
              <div className="position-relative">
                <input id="store-search" className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find anything" aria-expanded={Boolean(normalize(search))} aria-controls="store-results" />
                {normalize(search) && <div id="store-results" className="list-group position-absolute w-100 search-results">
                  {searchResults.map((space) => <button key={space.id} className={`list-group-item list-group-item-action ${selectedId === space.id ? 'active' : ''}`} onClick={() => focusSpace(space)}>{space.name} <span className="text-secondary">| {space.category}</span></button>)}
                  {!searchResults.length && <p className="text-secondary p-2 mb-0">No spaces match that search.</p>}
                </div>}
              </div></>}
            {navigation === 'loading' && <p className="small text-secondary mt-2">Loading map and directory…</p>}
            {selected && <section className="mt-3"><h5>{selected.name}</h5><p className="text-secondary small">Main level {selected.category.toLocaleLowerCase()}</p>
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
                <button className="btn btn-outline-secondary" disabled={instructionIndex === 0} onClick={() => dispatchAction(`step-${instructionIndex - 1}`)}>Previous</button>
                {navigation === 'preview' && <button className="btn btn-primary" onClick={() => dispatchAction('simulate')}>Begin</button>}
                {navigation === 'simulating' && <button className="btn btn-primary" onClick={() => dispatchAction('pause')}>Pause</button>}
                {navigation === 'paused' && <button className="btn btn-primary" onClick={() => dispatchAction('simulate')}>Resume</button>}
                {navigation === 'arrived' && <button className="btn btn-success" onClick={() => resetNavigation(true)}>Done</button>}
                <button className="btn btn-outline-secondary" disabled={instructionIndex >= directions.instructions.length - 1} onClick={() => dispatchAction(`step-${instructionIndex + 1}`)}>Next</button>
              </div>
              {navigation !== 'arrived' && <button className="btn btn-link p-0" onClick={() => resetNavigation()}>Cancel route</button>}
            </>}
            {navigation === 'error' && <button className="btn btn-link" onClick={() => resetNavigation()}>Cancel route</button>}
          </section>}
        </aside>
        <section className="col-12 col-lg-8 map-column position-relative">
          <div className="map-controls position-absolute top-0 end-0 p-3">
            <button className="btn btn-primary shadow-sm" disabled={!hasLocation} onClick={() => dispatchAction('where-am-i')}>Where am I?</button>
          </div>
          <MapCanvas selectedStoreId={selectedId} focusedSpaceId={focusedSpaceId} focusSequence={focusSequence} routeOrigin={routeOrigin} routeTargetId={routeTargetId} cameraMode={cameraMode} action={action} promotions={sales.data ?? []} onReady={({ stores: loadedStores, namedSpaces }) => { setStores(loadedStores); setDirectorySpaces(namedSpaces); }} onStartSelection={(id, name) => {
            const location = { id, name, floorId: mallConfig.mainFloorId };
            setStartPoint(location);
            setRouteOrigin({ kind: 'space', spaceId: id });
            if (isParking(name)) setParkingOffer(location);
            setRouteTargetId(selectedId);
            setLocationToast('open');
            setDirections(undefined);
            setInstructionIndex(0);
            setAction('');
          }} onRouteOriginChange={(origin, name) => {
            setRouteOrigin(origin);
            setStartPoint({ id: origin.kind === 'space' ? origin.spaceId : 'current-location', name, floorId: mallConfig.mainFloorId });
          }} onInstructionChange={setInstructionIndex} onState={(state, route) => { setNavigation(state); if (route) setDirections(route); }} onMessage={(notice) => { setMessage(notice); if (notice) setLocationToast('open'); }} onArrival={(spaceId, coordinate) => {
            setRouteOrigin({ kind: 'current-location', coordinate });
            setStartPoint({ id: 'current-location', name: 'Current simulated location', floorId: mallConfig.mainFloorId });
            setRouteTargetId(undefined);
            setArrivalPromotionSpaceId(sales.data?.some((promotion) => promotion.spaceId === spaceId) ? spaceId : undefined);
          }} onLocationAvailable={setHasLocation} />
        </section>
      </div>}
      {section === 'sales' && <section className="container py-4">
        <h2>Promotions</h2>
        <label className="visually-hidden" htmlFor="promotion-search">Find promotions</label>
        <div className="input-group mb-4">
          <input id="promotion-search" type="search" className="form-control" value={promotionSearch} onChange={(event) => setPromotionSearch(event.target.value)} placeholder="Search promotions" />
        </div>
        {content(sales, (sale) => <article key={sale.id} className="col-md-6"><div className="card h-100 shadow-lg"><div className="card-body"><p className="text-secondary small mb-1">{sale.storeName}</p><h5>{sale.title}</h5><p className="fs-5 fw-semibold">{sale.offer}</p><p>{sale.description}</p><p className="small text-secondary">{formatPromotionDate(sale.validFrom)}–{formatPromotionDate(sale.validUntil)}</p><button className="btn btn-outline-success btn-sm" onClick={() => findOnMap(sale.storeName)}>Find on map</button></div></div></article>, filteredPromotions, 'No promotions match that search.')}
      </section>}
      {section === 'food' && <section className="container py-4"><h2>Food Court Menus</h2>{content(food, (vendor) => <article key={vendor.id} className="col-md-6"><div className="card h-100 shadow-lg"><div className="card-body"><h5>{vendor.name}</h5><ul className="list-group list-group-flush mb-3">{vendor.menu.map((item) => <li key={item.id} className="list-group-item px-0">{item.name} — {(item.priceMinor / 100).toLocaleString('en-CA', { style: 'currency', currency: item.currency })}<small className="d-block text-secondary">{item.description}</small></li>)}</ul>{vendor.storeName && <button className="btn btn-outline-success btn-sm" onClick={() => findOnMap(vendor.storeName)}>Find on map</button>}</div></div></article>)}</section>}
      {section === 'events' && <section className="container py-4"><h2>Events</h2>{content(events, (event) => <article key={event.id} className="col-md-6"><div className="card h-100 shadow-lg"><div className="card-body"><h5>{event.title}</h5><p>{event.description}</p><p className="small text-secondary">{event.location} · {new Date(event.startsAt).toLocaleString()}</p>{event.storeName && <button className="btn btn-outline-success btn-sm" onClick={() => findOnMap(event.storeName)}>Find on map</button>}</div></div></article>)}</section>}
    </main>
    {parkingOffer && <aside className="position-fixed bottom-0 start-0 p-3 location-toast" role="dialog" aria-labelledby="save-parking-title">
      <div className="card shadow">
        <div className="card-body">
          <h2 id="save-parking-title" className="h5">Save parking?</h2>
          <p className="mb-3">Save <strong>{parkingOffer.name}</strong> so you can find it later.</p>
          <div className="btn-group">
            <button type="button" className="btn btn-success" onClick={saveParking}>Save parking</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setParkingOffer(undefined)}>Not now</button>
          </div>
        </div>
      </div>
    </aside>}
    {arrivalPromotionSpaceId && <><div className="modal-backdrop fade show" onClick={() => setArrivalPromotionSpaceId(undefined)} aria-hidden="true" />
      <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="arrival-promotion-title" tabIndex={-1} ref={promotionDialogRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="arrival-promotion-title" className="modal-title fs-5">Welcome to {arrivalStore?.name ?? 'your destination'}</h2>
              <button type="button" className="btn-close" aria-label="Close promotion" onClick={() => setArrivalPromotionSpaceId(undefined)} />
            </div>
            <div className="modal-body">
              {arrivalPromotions.map((promotion) => <article key={promotion.id}>
                <p className="text-secondary mb-1">{promotion.title}</p>
                <p className="fs-4 fw-semibold">{promotion.offer}</p>
                <p>{promotion.description}</p>
                <p className="small text-secondary mb-0">Valid {formatPromotionDate(promotion.validFrom)}–{formatPromotionDate(promotion.validUntil)}</p>
              </article>)}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setArrivalPromotionSpaceId(undefined)}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>}
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
