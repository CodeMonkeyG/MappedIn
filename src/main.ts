import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { BlueDot } from '@mappedin/blue-dot';
import { getMapData, show3dMap, DOORS } from '@mappedin/mappedin-js';
import type { Directions, Label, Space } from '@mappedin/mappedin-js';

async function init() {
  let navigationMode = false;
  let navigationStartSpace: Space | undefined;
  let navigationEndSpace: Space | undefined;
  let currentDirections: Directions | undefined;
  let simulationTimer: number | undefined;
  const options = {
    key: 'mik_yeBk0Vf0nNJtpesfu560e07e5',
    secret: 'mis_2g9ST8ZcSFb5R9fPnsvYhrX3RyRwPtDGbMGweCYKEq385431022',
    mapId: '660c0c6e7c0c4fe5b4cc484c',
  };
  const mapData = await getMapData(options);
  const mapView = await show3dMap(
    document.getElementById('mappedin-map') as HTMLDivElement,
    mapData
  );
  const blueDot = new BlueDot(mapView);


  //So far this is the cleanest way I have found
  //to deal with the need to click on a space with a name
  //and have the one label appear.
  //I spent enough time on this that I left the lat+lon
  //for some other time.
  //I admit I did get stuck on this for a bit because the tutorials
  //were adding labels on click coordinates and it was not what I wanted
  //Add the labels for the spaces with names
  let labelsByTargetId: Record<string, Label> = {};
  mapData.getByType('space').forEach((space) => {
    mapView.updateState(space, {
      interactive: true,
      hoverColor: '#0099FF',
    });

    if (space.name !== '') {
      // labelsByTargetId[space.id] = 
      let newLabel = mapView.Labels.add(
        space,
        space.name,
        {
          interactive: true
        }
      );

      labelsByTargetId[space.id] = newLabel;
    }
  });

  mapView.updateState(DOORS.Interior, {
    visible: true,
  });

  mapView.updateState(DOORS.Exterior, {
    visible: true,
    color: 'black',
  });


  const modeButton = document.getElementById('mode-button');
  const startWalkingButton = document.getElementById('start-walking-button') as HTMLButtonElement | null;
  const turnByTurnPanel = document.getElementById('turn-by-turn-panel');
  const turnByTurnContent = document.getElementById('turn-by-turn-content');
  const turnByTurnOkButton = document.getElementById('turn-by-turn-ok');

  const stopSimulation = () => {
    if (simulationTimer !== undefined) {
      window.clearInterval(simulationTimer);
      simulationTimer = undefined;
    }
    blueDot.follow(false);
    blueDot.disable();
  };

  const resetNavigation = async () => {
    stopSimulation();
    await mapView.Navigation.clear();
    navigationStartSpace = undefined;
    navigationEndSpace = undefined;
    currentDirections = undefined;
    if (startWalkingButton) {
      startWalkingButton.disabled = true;
      startWalkingButton.hidden = true;
    }
    if (turnByTurnPanel) {
      turnByTurnPanel.hidden = true;
    }
    if (turnByTurnContent) {
      turnByTurnContent.replaceChildren();
    }
    navigationMode = false;
    if (modeButton) {
      modeButton.textContent = 'Start Navigate Mode';
    }
  };

  const showDirections = (directions: Directions) => {
    if (!turnByTurnContent) {
      return;
    }

    const heading = document.createElement('h2');
    heading.textContent = 'Turn-by-turn directions';
    turnByTurnContent.replaceChildren(heading);

    const list = document.createElement('ol');
    directions.instructions.forEach((instruction) => {
      const item = document.createElement('li');
      const action = instruction.action.bearing ?? instruction.action.type;
      item.textContent = `${action} - ${instruction.distance.toFixed(1)} m`;
      list.appendChild(item);
    });
    turnByTurnContent.appendChild(list);
  };

  //For the blue dot I did just point Hermes at the documentation
  //and her sorted the rest out the functionality was sorted out.
  //Here is the prompt I used:
  //"now I want to see if I can one shot the next piece with you. i want to add
  //and demo the blue dot navigation while also displaying turn by turn navigation.
  //if the map sdk already has a way of displaying turn by turn directions simply activate it.
  //however we are also going to use the html outside the map, similar to the navigate button.
  //When the navigate button is activated a start walking navigation button should appear but
  //greyed out. when the user selects the second destination it should make the start walking
  //button clearly clickable. when clicked it will be a div should cover the buttons and be where
  //the turn by turn directions are displayed. at that point the navigation should be simulated
  //and we should be able to follow the blue dot through the path. when the end is reached, update
  //the turn by turn div to say so with an ok button. when the ok button is clicked, everything
  //should be reset back to the initial base state for activating navigation mode.
  //here is the documentation developer.mappedin.com/web-sdk/blue-dot"
  //it got me pretty far but the turn by turn div was not what I was expecting so I picked it up
  //from here in order to style things a bit more
  const simulateWalking = (directions: Directions) => {
    const coordinates = directions.coordinates;
    let coordinateIndex = 0;

    blueDot.enable({
      watchDevicePosition: false,
      preventOutOfBounds: false,
      accuracyThreshold: 50,
    });
    blueDot.follow('position-and-path-direction', {
      zoomLevel: 20,
      pitch: 45,
      duration: 500,
    });

    const updatePosition = () => {
      const coordinate = coordinates[coordinateIndex];
      blueDot.update({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        floorOrFloorId: coordinate.floorId,
        accuracy: 0,
      }, { animate: true });
      mapView.Navigation.trackCoordinate(coordinate, {
        mode: 'travelled',
      });

      if (coordinateIndex === coordinates.length - 1) {
        if (simulationTimer !== undefined) {
          window.clearInterval(simulationTimer);
          simulationTimer = undefined;
        }
        if (turnByTurnContent) {
          turnByTurnContent.replaceChildren();
          const completeMessage = document.createElement('h2');
          completeMessage.textContent = 'You have reached your destination.';
          turnByTurnContent.appendChild(completeMessage);
        }
        return;
      }

      coordinateIndex += 1;
    };

    updatePosition();
    simulationTimer = window.setInterval(updatePosition, 1000);
  };

  startWalkingButton?.addEventListener('click', () => {
    if (!currentDirections || !turnByTurnPanel || !turnByTurnContent) {
      return;
    }

    startWalkingButton.disabled = true;
    turnByTurnPanel.hidden = false;
    showDirections(currentDirections);
    simulateWalking(currentDirections);

  });

  turnByTurnOkButton?.addEventListener('click', () => {
    void resetNavigation();
  });

  modeButton?.addEventListener('click', async () => {
    navigationMode = !navigationMode;
    modeButton.textContent = navigationMode
      ? 'Stop Navigation Mode'
      : 'Start Navigate Mode';

    if (!navigationMode) {
      await resetNavigation();
      return;
    }

    for (let spaceId in labelsByTargetId) {
      mapView.updateState(labelsByTargetId[spaceId], {
        enabled: true,
      });
    }

    if (startWalkingButton) {
      startWalkingButton.hidden = false;
      startWalkingButton.disabled = true;
    }

    await mapView.Camera.focusOn(mapData.getByType('space'), {
      pitch: 0,
      bearing: 0,
      duration: 1000,
      easing: 'ease-in-out',
    });


  });

  mapView.on('click', async (event) => {
    //Just noting here that I paused the video after the lady demonstrated the
    //path building by adding two hardcoded spaces and then built out the 
    //space selection on my own. I am noting only because the fist this she demonstrated
    //when I press play was exactly this.
    if (!navigationMode) {
      const clickedSpace = event?.spaces?.[0];
      if (clickedSpace?.name) {
        let targetLabel = labelsByTargetId[clickedSpace.id];
        mapView.updateState(targetLabel, {
          enabled: !mapView.getState(targetLabel).enabled,
        });
      }
    }

    if (navigationMode) {
      const clickedSpace = event?.spaces?.[0];

      if (!clickedSpace) {
        return;
      }

      if (!navigationStartSpace) {
        navigationStartSpace = clickedSpace;
        return;
      }

      if (!navigationEndSpace) {
        navigationEndSpace = clickedSpace;

        const directions = await mapData.getDirections(
          navigationStartSpace,
          navigationEndSpace
        );

        if (!directions) {
          console.warn('No route was found between the selected spaces.');
          return;
        }

        if (directions.coordinates.length === 0) {
          console.warn('The selected spaces are already at the same location.');
          return;
        }

        currentDirections = directions;
        if (startWalkingButton) {
          startWalkingButton.disabled = false;
        }
        await mapView.Navigation.draw(directions);
        return;
      }

      if (navigationStartSpace && navigationEndSpace) {
        navigationStartSpace = clickedSpace;
        navigationEndSpace = undefined;
        currentDirections = undefined;
        if (startWalkingButton) {
          startWalkingButton.disabled = true;
        }
        await mapView.Navigation.clear();
        return;
      }
    }
  });











  // For debugging purposes
  (window as unknown as Window & { mapView: typeof mapView }).mapView = mapView;
}

init();