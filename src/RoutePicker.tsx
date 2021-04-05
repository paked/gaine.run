import React, { useState, useRef } from "react";

import {
  MapContainer,
  ImageOverlay,
  Polyline,
  GeoJSON,
  Marker,
} from "react-leaflet";
import L, { CRS, Map } from "leaflet";

import {
  Feature,
  Point,
  FeatureCollection,
  LineString,
  Position,
} from "geojson";
import data from "./geojson.json";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import PathFinder from "geojson-path-finder-nw";

import "./RoutePicker.css";

function geojsonFromMap(m: Map): FeatureCollection {
  var fg = L.featureGroup();

  m.eachLayer((layer) => {
    if ((layer instanceof L.Path || layer instanceof L.Marker) && layer.pm) {
      fg.addLayer(layer);
    }
  });

  let gj = fg.toGeoJSON();
  if (gj.type !== "FeatureCollection") {
    throw new Error("this geojson is not a featurecollection!");
  }

  return gj;
}

function padGeojson(d: FeatureCollection): FeatureCollection {
  d.features = d.features.map((f) => {
    if (f.geometry.type !== "LineString") {
      return f;
    }

    f.geometry = padLineString(f.geometry);

    return f;
  });

  return d;
}

function padLineString(line: LineString): LineString {
  line.coordinates = padRoute(line.coordinates);

  return line;
}

function padRoute(route: Position[]): Position[] {
  let newroute: Position[] = [];

  for (let i = 0; i < route.length - 1; i++) {
    let start = route[i];
    let end = route[i + 1];

    newroute.push(start);

    let dx = end[0] - start[0];
    let dy = end[1] - start[1];

    let dist = Math.sqrt(dx * dx + dy * dy);

    const size = 5;
    const count = dist / size;
    for (let j = 0; j < count; j++) {
      newroute.push([start[0] + (dx / count) * j, start[1] + (dy / count) * j]);
    }

    if (i + 2 === route.length) {
      newroute.push(end);
    }
  }

  return newroute;
}

const shouldPad = true;
const padded = shouldPad
  ? padGeojson(data as FeatureCollection)
  : (data as FeatureCollection);

type Waypoint = Feature<Point>;

interface Segment {
  positions: L.LatLngExpression[];
  key: string;
}

function RoutePicker() {
  let [segments, setSegments] = useState<Segment[]>([]);
  let segmentsRef = useRef<Segment[]>();
  segmentsRef.current = segments;

  let [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  let waypointsRef = useRef<Waypoint[]>();
  waypointsRef.current = waypoints;

  let [map, setMap] = useState<Map | undefined>(undefined);
  let whenCreated = (m: Map) => {
    setMap(m);

    m.pm.addControls({
      position: "topleft",
      drawPolyline: true,
      drawRectangle: false,
      drawCircle: false,
      drawPolygon: false,
      editMode: true,
      cutPolygon: false,
      dragMode: false,
      drawCircleMarker: false,
    });

    console.log((m.pm as any).Toolbar);

    m.on("pm:create", (event: any) => {
      if (event.shape !== "Marker") {
        // setLastMarker(null);

        return;
      }

      if (!waypointsRef.current || !segmentsRef.current) {
        console.error("waypoints not set");
        return;
      }

      let to = event.marker.toGeoJSON() as Feature<Point>;

      if (waypointsRef.current.length > 0) {
        let route: [number, number][] = [];

        let from = waypointsRef.current[waypointsRef.current.length - 1];

        let pf = new PathFinder(geojsonFromMap(m));
        let path = pf.findPath(from, to);
        if (path) {
          route = path.path;
          route = route.map((l) => [l[1], l[0]]);
        } else {
          route = [
            [from.geometry.coordinates[1], from.geometry.coordinates[0]],
            [to.geometry.coordinates[1], to.geometry.coordinates[0]],
          ];
        }

        setSegments([
          ...segmentsRef.current,
          { positions: route, key: segmentsRef.current.length.toString() },
        ]);
      }

      setWaypoints([...waypointsRef.current, to]);
    });
  };

  return (
    <div>
      <MapContainer
        center={[1900 / 2, 1400 / 2]}
        zoom={-1}
        minZoom={-3}
        maxZoom={3}
        scrollWheelZoom={false}
        style={{ height: "800px", backgroundColor: "white" }}
        crs={CRS.Simple}
        whenCreated={whenCreated}
      >
        <GeoJSON
          data={padded}
          pathOptions={{ color: "blue", weight: 4, opacity: 0.1 }}
        />

        { segmentsRef.current.map((segment) => <Polyline
        key={segment.key}
        positions={segment.positions}
        color="red"
        pathOptions={{ opacity: 0.5 }}
      />
        )}

        <ImageOverlay
          bounds={[
            [0, 0],
            [1900, 1400],
          ]}
          url="/map.png"
        />

        <Marker
          position={[1900 / 2, 1400 / 2]}
          icon={
            new L.DivIcon({
              html: "<span class='icon'>1</span>",
              className: "icon",
              iconSize: undefined,
            })
          }
          draggable={true}
        ></Marker>
      </MapContainer>

      {/* <button onClick={() => console.log(geojsonFromMap(map!))}>Export!</button> */}
    </div>
  );
}

export default RoutePicker;
