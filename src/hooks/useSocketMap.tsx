import { use, useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  WebSocketContext,
  type SocketResponse,
} from "../context/WebSocketContext";
import Cookies from "js-cookie";
import type { Client } from "../types";
// sets the access token, associating the map with your Mapbox account and its permissions
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const clientMarker = new Map<String, mapboxgl.Marker>();

export const useSocketMap = () => {
  const { status, connectToServer, suscribeToMessage, send } =
    use(WebSocketContext);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>(null);
  const [me, setMe] = useState<Client | null>(null);

  useEffect(() => {
    const name = Cookies.get("name");
    const color = Cookies.get("color");
    const coordsString = Cookies.get("coords");

    if (!name || !color || coordsString === "undefined" || !coordsString)
      return;
    if (status !== "offline") return;

    const coords = JSON.parse(coordsString);

    connectToServer(name, color, coords);
  }, [connectToServer, status]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;
    // creates the map, setting the container to the id of the div you added in step 2, and setting the initial center and zoom level of the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current, // container ID
      center: [-122.467895, 37.800126], // starting position [lng, lat]. Note that lat must be set between -90 and 90
      zoom: 14.5, // starting zoom
      attributionControl: false,
    });
  }, []);

  const createMarker = useCallback(
    (client: Client, draggable: boolean = false) => {
      if (!map.current) return;
      if (clientMarker.has(client.clientId)) return;

      const marker = new mapboxgl.Marker({
        color: client.color || "gray",
      })
        .setLngLat([client.coords.lng, client.coords.lat])
        .setDraggable(draggable)
        .setPopup(new mapboxgl.Popup().setHTML(`<h1>${client.name}</h1>`))
        .addTo(map.current)
        .on("drag", (event) => {
          Cookies.set("coords", JSON.stringify(event.target.getLngLat()));
          send({
            type: "CLIENT_MOVE",
            payload: {
              clientId: client.clientId,
              coords: event.target.getLngLat(),
            },
          });
        });

      clientMarker.set(client.clientId, marker);
      return marker;
    },
    [send],
  );

  const removeMarker = (clientId: string) => {
    if (!clientMarker.has(clientId)) return;
    const marker = clientMarker.get(clientId);
    if (!marker) return;
    marker.remove();
  };

  const moveMarker = (client: Client) => {
    if (!clientMarker.has(client.clientId)) return;
    const marker = clientMarker.get(client.clientId);
    if (!marker) return;

    marker.setLngLat([client.coords.lng, client.coords.lat]);
  };

  const handleResponse = (response: SocketResponse) => {
    const { type, payload } = response;
    console.log(type, payload);
    switch (type) {
      case "WELCOME":
        setMe(payload);
        createMarker(payload, true);
        break;

      case "CLIENT_JOINED":
        createMarker(payload);
        break;

      case "CLIENT_MOVED":
        moveMarker(payload);

        break;

      case "CLIENT_LEFT":
        removeMarker(payload.clientId);

        break;

      case "CLIENT_STATE":
        payload.forEach((client) => createMarker(client, false));
        break;
    }
  };

  useEffect(() => {
    return suscribeToMessage(handleResponse);
  }, [suscribeToMessage, handleResponse]);

  return {
    map,
    mapContainer,
    connectToServer,
    me,
  };
};
