import { useEffect, useRef, useState } from "react";
import { BlueDot } from "@mappedin/blue-dot";
import { DOORS, getMapData, show3dMap } from "@mappedin/mappedin-js";
import type { Coordinate, Directions, Label, Marker, Space } from "@mappedin/mappedin-js";
import { hasMapCredentials, mallConfig } from "../../config/mall";
import type { Sale } from "../../services/content";
import { categoryFor, isStore } from "../wayfinding/directory";
import type {
  DirectoryPayload,
  NavigationState,
  RouteOrigin,
  SimulationCameraMode,
} from "../wayfinding/types";

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

const defaultStartSpaceId = "s_652062634c59296984d6ccca";

export interface MapCanvasProps {
  selectedStoreId?: string;
  routeOrigin?: RouteOrigin;
  routeTargetId?: string;
  cameraMode: SimulationCameraMode;
  action: string;
  onReady: (directory: DirectoryPayload) => void;
  onStartSelection: (id: string, name: string) => void;
  onRouteOriginChange: (origin: RouteOrigin, name: string) => void;
  onInstructionChange: (index: number) => void;
  onState: (state: NavigationState, directions?: Directions) => void;
  onMessage: (message?: string) => void;
  promotions: Sale[];
  onArrival: (spaceId: string, coordinate: Coordinate) => void;
  onLocationAvailable: (available: boolean) => void;
  focusedSpaceId?: string;
  focusSequence: number;
}

export function MapCanvas({
  selectedStoreId,
  routeOrigin,
  routeTargetId,
  cameraMode,
  action,
  onReady,
  onStartSelection,
  onRouteOriginChange,
  onInstructionChange,
  onState,
  onMessage,
  promotions,
  onArrival,
  onLocationAvailable,
  focusedSpaceId,
  focusSequence,
}: MapCanvasProps) {
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
  const escapeHtml = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character] ?? character,
    );
  const setSimulationCamera = (mode: SimulationCameraMode) => {
    runtime.current?.blueDot.follow(
      mode === "follow" ? "position-and-path-direction" : "position-only",
      mode === "follow"
        ? { zoomLevel: 20, pitch: 45, duration: 500 }
        : { zoomLevel: 17, pitch: 0, bearing: 0, duration: 500 },
    );
  };
  const focusSimulationCoordinate = (coordinate: Coordinate, mode: SimulationCameraMode) => {
    void runtime.current?.mapView.Camera.focusOn(
      coordinate,
      mode === "follow"
        ? { minZoomLevel: 20, maxZoomLevel: 20, pitch: 45, duration: 500 }
        : { minZoomLevel: 17, maxZoomLevel: 17, pitch: 0, bearing: 0, duration: 500 },
    );
  };
  const findSpace = (spaceId?: string) =>
    runtime.current?.spaces.find((space) => space.id === spaceId);
  const routeOriginTarget = (origin?: RouteOrigin) =>
    origin?.kind === "current-location" ? origin.coordinate : findSpace(origin?.spaceId);
  const enableBlueDot = () => {
    runtime.current?.blueDot.enable({
      watchDevicePosition: false,
      preventOutOfBounds: false,
      accuracyThreshold: 50,
    });
  };
  const updateBlueDot = (coordinate: Coordinate, animate: boolean, fallbackFloorId?: string) => {
    const blueDot = runtime.current?.blueDot;
    if (!blueDot) return;
    enableBlueDot();
    blueDot.update(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        floorOrFloorId: coordinate.floorId ?? fallbackFloorId,
        accuracy: 0,
      },
      { animate },
    );
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
    // SDK markers outlive the nearby query result unless each instance is explicitly removed.
    current.promotionMarkers.forEach((marker) => current.mapView.Markers.remove(marker));
    current.promotionMarkers.clear();
  };
  const updateNearbyPromotions = (coordinate: Coordinate) => {
    const current = runtime.current;
    const nearbyToken = ++nearbyPromotionToken.current;
    const promotionBySpaceId = new Map(
      promotionsRef.current.map((promotion) => [promotion.spaceId, promotion]),
    );
    const promotionSpaces =
      current?.stores.filter((store) => promotionBySpaceId.has(store.id)) ?? [];
    if (!current || !promotionSpaces.length) return;
    void current.mapData.Query.nearest(coordinate, promotionSpaces, {
      mode: "travel-distance",
      maxDistance: 35,
      maxResults: 4,
      limit: "same-floor",
    })
      .then((results) => {
        if (nearbyToken !== nearbyPromotionToken.current || runtime.current !== current) return;
        const nearbyIds = new Set((results ?? []).map((result) => result.feature.id));
        promotionSpaces.forEach((space) => {
          const promotion = promotionBySpaceId.get(space.id);
          if (!promotion) return;
          if (nearbyIds.has(space.id)) {
            if (!current.promotionMarkers.has(space.id)) {
              // Marker content is HTML rendered by the SDK, so fixture text must be escaped first.
              const marker = current.mapView.Markers.add(
                space,
                `<div class="badge text-bg-primary shadow-sm">${space.name} | ${escapeHtml(promotion.offer)}</div>`,
                { placement: "top", rank: "always-visible" },
              );
              current.promotionMarkers.set(space.id, marker);
            }
            if (!current.highlightedPromotions.has(space.id)) {
              current.highlightedPromotions.add(space.id);
              current.mapView.updateState(space, { height: 1 });
            }
          } else {
            if (current.highlightedPromotions.delete(space.id))
              current.mapView.updateState(space, { height: undefined });
            const marker = current.promotionMarkers.get(space.id);
            if (marker) {
              current.mapView.Markers.remove(marker);
              current.promotionMarkers.delete(space.id);
            }
          }
        });
      })
      .catch(() => undefined);
  };
  const reset = (origin = routeOrigin, focusOrigin = true) => {
    pauseSimulation();
    routeToken.current += 1;
    clearNearbyPromotions();
    route.current = undefined;
    simulationIndex.current = 0;
    void runtime.current?.mapView.Navigation.clear();
    const startingTarget = routeOriginTarget(origin);
    if (focusOrigin && startingTarget)
      void runtime.current?.mapView.Camera.focusOn(startingTarget, {
        pitch: 0,
        bearing: 0,
        duration: 700,
      });
    onState(selectedStoreId ? "selected" : "idle");
    onMessage();
  };
  const focusSpace = (spaceId: string) => {
    const current = runtime.current;
    const target = findSpace(spaceId);
    if (!current || !target) {
      if (current) onMessage("That saved location is no longer available on this map.");
      return;
    }
    void current.mapView.Camera.focusOn(target, { pitch: 0, bearing: 0, duration: 700 });
    onMessage(`Showing ${target.name?.trim() || "the selected space"}.`);
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
        if (!hasMapCredentials)
          throw new Error(
            "Map credentials are not configured. Set VITE_MAPPEDIN_KEY and VITE_MAPPEDIN_SECRET.",
          );
        const mapData = await getMapData(mallConfig.credentials);
        // React may unmount/remount while the SDK is loading; never attach a stale map view.
        if (disposed || !containerRef.current) return;
        const mapView = await show3dMap(containerRef.current, mapData);
        if (disposed) return;
        const spaces = mapData.getByType("space");
        const namedSpaces = spaces.filter(
          (space) => space.floor?.id === mallConfig.mainFloorId && Boolean(space.name?.trim()),
        );
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
        mapView.updateState(DOORS.Exterior, { visible: true, color: "black" });
        runtime.current = {
          mapData,
          mapView,
          blueDot: new BlueDot(mapView),
          spaces,
          stores,
          labels,
          promotionMarkers: new Map(),
          highlightedPromotions: new Set(),
        };
        // Publish readiness only after the SDK runtime is complete so remounted route effects can use it.
        setMapReady(true);
        if (focusedSpaceIdRef.current) focusSpace(focusedSpaceIdRef.current);
        const existingOrigin = routeOriginRef.current;
        const defaultStart = existingOrigin
          ? undefined
          : spaces.find((space) => space.id === defaultStartSpaceId);
        const initialCoordinate =
          existingOrigin?.kind === "current-location"
            ? existingOrigin.coordinate
            : existingOrigin?.kind === "space"
              ? spaces.find((space) => space.id === existingOrigin.spaceId)?.anchorTarget
              : defaultStart?.anchorTarget;
        if (initialCoordinate) {
          const coordinate = initialCoordinate;
          lastCoordinate.current = coordinate;
          updateBlueDot(coordinate, false, defaultStart?.floor?.id);
          onLocationAvailable(true);
        }
        if (defaultStart) {
          onStartSelectionRef.current(
            defaultStart.id,
            defaultStart.name?.trim() || "Parking Lot B",
          );
          onRouteOriginChange(
            { kind: "space", spaceId: defaultStart.id },
            defaultStart.name?.trim() || "Parking Lot B",
          );
        }
        onReady({
          stores: stores.map((space) => ({
            id: space.id,
            name: space.name,
            floorId: mallConfig.mainFloorId,
          })),
          namedSpaces: namedSpaces
            .map((space) => {
              const name = space.name.trim();
              const store = isStore(space);
              return {
                id: space.id,
                name,
                floorId: mallConfig.mainFloorId,
                isStore: store,
                category: categoryFor(name, store),
              };
            })
            .sort((left, right) => left.name.localeCompare(right.name)),
        });
        onState(existingOrigin || defaultStart ? "selected" : "idle");
        mapView.on("click", (event) => {
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
          onStartSelectionRef.current(target.id, target.name?.trim() || "Selected map point");
          onRouteOriginChange(
            { kind: "space", spaceId: target.id },
            target.name?.trim() || "Selected map point",
          );
          onState("selected");
          onMessage();
        });
      } catch (error) {
        onState("error");
        onMessage(
          error instanceof Error ? error.message : "The map could not be loaded. Please retry.",
        );
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
    if (highlightedDestination.current)
      current.mapView.updateState(highlightedDestination.current, { color: undefined });
    highlightedDestination.current = target;
    if (target) {
      let highlighted = false;
      const blink = () => {
        highlighted = !highlighted;
        current.mapView.updateState(target, { color: highlighted ? "#3f9b68" : undefined });
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
    // Directions requests cannot be cancelled, so discard a response for an older route selection.
    pauseSimulation();
    route.current = undefined;
    instructionCoordinateIndexes.current = [];
    hasMovedSinceRouteStarted.current = false;
    onState("calculating");
    onMessage();
    void (async () => {
      current.mapView.Navigation.clear();
      try {
        const directions = await current.mapData.getDirections(origin, destination);
        if (token !== routeToken.current) return;
        if (!directions) throw new Error("No route is available for this entrance and store.");
        if (!directions.coordinates.length) throw new Error("You are already at this destination.");
        if (!directions.instructions.length)
          throw new Error("This route does not include usable turn-by-turn instructions.");
        route.current = directions;
        instructionCoordinateIndexes.current = directions.instructions.map((instruction) =>
          directions.coordinates.reduce((nearestIndex, coordinate, index, coordinates) => {
            const nearest = coordinates[nearestIndex];
            const distance =
              (coordinate.latitude - instruction.coordinate.latitude) ** 2 +
              (coordinate.longitude - instruction.coordinate.longitude) ** 2;
            const nearestDistance =
              (nearest.latitude - instruction.coordinate.latitude) ** 2 +
              (nearest.longitude - instruction.coordinate.longitude) ** 2;
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
          screenOffsets: { top: 0.12, right: 0.12, bottom: 0.12, left: 0.12, type: "portion" },
        });
        if (token === routeToken.current) onState("preview", directions);
      } catch (error) {
        if (token === routeToken.current) {
          onState("error");
          onMessage(error instanceof Error ? error.message : "Directions could not be calculated.");
        }
      }
    })();
  }, [routeTargetId, routeOrigin, mapReady]);

  useEffect(() => {
    const current = runtime.current;
    if (!current) return;
    if (action.startsWith("cancel-") || action.startsWith("done-")) {
      if (
        action.startsWith("cancel-") &&
        (hasMovedSinceRouteStarted.current || simulationIndex.current > 0) &&
        lastCoordinate.current
      ) {
        // After movement, the next route must begin at the simulated coordinate, not the original space.
        const currentLocationOrigin = {
          kind: "current-location" as const,
          coordinate: lastCoordinate.current,
        };
        onRouteOriginChange(currentLocationOrigin, "Current simulated location");
        reset(currentLocationOrigin, false);
      } else {
        reset(undefined, false);
      }
      return;
    }
    if (action.startsWith("clear-route-")) {
      pauseSimulation();
      if (
        (hasMovedSinceRouteStarted.current || simulationIndex.current > 0) &&
        lastCoordinate.current
      ) {
        onRouteOriginChange(
          { kind: "current-location", coordinate: lastCoordinate.current },
          "Current simulated location",
        );
      }
      route.current = undefined;
      instructionCoordinateIndexes.current = [];
      simulationIndex.current = 0;
      void current.mapView.Navigation.clear();
      onState("idle");
      onMessage();
      return;
    }
    if (action.startsWith("where-am-i-")) {
      const coordinate = lastCoordinate.current;
      if (!coordinate) {
        onMessage("Choose a starting point on the map before using Where am I?.");
      } else {
        updateBlueDot(coordinate, true);
        current.blueDot.follow("position-only", {
          zoomLevel: 17,
          pitch: 0,
          bearing: 0,
          duration: 500,
        });
        updateNearbyPromotions(coordinate);
        onMessage("Centered on your simulated location.");
      }
      return;
    }
    if (action.startsWith("follow-") && route.current) {
      setSimulationCamera("follow");
      return;
    }
    const manualStep = /^step-(\d+)-/.exec(action);
    if (manualStep && route.current) {
      const instructionIndex = Number(manualStep[1]);
      const coordinateIndex = instructionCoordinateIndexes.current[instructionIndex];
      const coordinate = route.current.coordinates[coordinateIndex];
      if (!coordinate) return;
      // Instructions map to nearest route coordinates so stepping keeps the dot on the drawn path.
      const wasSimulating = timer.current !== undefined;
      pauseSimulation();
      lastCoordinate.current = coordinate;
      simulationIndex.current = Math.min(coordinateIndex + 1, route.current.coordinates.length - 1);
      hasMovedSinceRouteStarted.current ||= coordinateIndex > 0;
      updateBlueDot(coordinate, true);
      current.mapView.Navigation.trackCoordinate(coordinate, { mode: "travelled" });
      updateNearbyPromotions(coordinate);
      focusSimulationCoordinate(coordinate, cameraMode);
      onInstructionChange(instructionIndex);
      if (wasSimulating) onState("paused", route.current);
      return;
    }
    if (action.startsWith("simulate-") && route.current) {
      const directions = route.current;
      pauseSimulation();
      let index = simulationIndex.current;
      enableBlueDot();
      setSimulationCamera(cameraMode);
      onState("simulating", directions);
      const advance = () => {
        const coordinate = directions.coordinates[index];
        if (!coordinate) return;
        lastCoordinate.current = coordinate;
        hasMovedSinceRouteStarted.current ||= index > 0;
        onLocationAvailable(true);
        updateBlueDot(coordinate, true);
        runtime.current?.mapView.Navigation.trackCoordinate(coordinate, { mode: "travelled" });
        updateNearbyPromotions(coordinate);
        onInstructionChange(
          instructionCoordinateIndexes.current.reduce(
            (activeInstruction, instructionCoordinateIndex, instructionIndex) =>
              instructionCoordinateIndex <= index ? instructionIndex : activeInstruction,
            0,
          ),
        );
        if (index >= directions.coordinates.length - 1) {
          pauseSimulation();
          onState("arrived", directions);
          onMessage("Simulated arrival. You have reached your destination.");
          const destination = findSpace(routeTargetId);
          if (destination) {
            const arrivalToken = routeToken.current;
            void current.mapView.Camera.focusOn(destination, {
              pitch: 0,
              bearing: 0,
              duration: 800,
            }).finally(() => {
              if (arrivalToken === routeToken.current) onArrival(destination.id, coordinate);
            });
          }
          return;
        }
        index += 1;
        simulationIndex.current = index;
      };
      advance();
      if (timer.current === undefined && index < directions.coordinates.length - 1)
        timer.current = window.setInterval(advance, 700);
      return;
    }
    if (action.startsWith("pause-") && timer.current) {
      pauseSimulation();
      onState("paused", route.current);
    }
  }, [action]);

  return (
    <div
      ref={containerRef}
      className="mappedin-map"
      aria-label="Interactive Greenfield Mall map"
    />
  );
}
