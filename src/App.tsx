import React, { useState, createRef } from 'react';
import logo from './logo.svg';

import { MapContainer, ImageOverlay, Polyline, GeoJSON } from 'react-leaflet';
import L, { CRS, Map } from 'leaflet';

import { GeoJsonObject, Point } from 'geojson';
import data from './geojson.json' ;

import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import PathFinder from 'geojson-path-finder-nw';

// import 'leaflet/dist/leaflet.css';
import './App.css';

let lastMarker: Point | undefined;

function App() {
  let pRef = createRef<typeof Polyline>();
  let pf = new PathFinder(data, {precision: 1});

  let [ path, setPath ] = useState<[number, number][]>([]);

  let [ map, setMap] = useState<Map | undefined>(undefined);
  let whenCreated = (m: Map) => {
    setMap(m);

    m.pm.addControls({
      position: 'topleft',
      drawCircle: false,
    });

    let start = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
            977,
            1277.25
        ]
      }
    };

    let finish = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
            951,
            1385.5
        ]
      }
    };

    let p : [number, number][] = pf.findPath(start, finish).path;
    p = p.map(l => [l[1], l[0]])

    setPath(p);

    m.on('pm:create', (e: any) => {
      if (e.shape != "Marker") return;

      let point = e.marker.toGeoJSON() as Point;

      console.log(lastMarker, point);

      if (lastMarker) {
        let r = pf.findPath(lastMarker, point);
        if (!r) {
          console.error("route is null");
          lastMarker = undefined;

          return;
        }

        let route : [number, number][] = r.path;

        console.log(route);

        route = route.map(l => [l[1], l[0]])

        setPath(route);

        lastMarker = undefined;

        return;
      }

      lastMarker = point;
    });
  }

  let exportGeoJSON = () => {
    if (!map) {
      console.error('map is undefined?');

      return;
    }

    if (!pRef.current) {
      console.error("pref doesn't exist");
    }

    console.log(pRef.current);

    var fg = L.featureGroup();

    map.eachLayer((layer) => {
      if (pRef.current as any === layer as any) {
        return;
      }

      if ((layer instanceof L.Path || layer instanceof L.Marker ) && layer.pm) {
        fg.addLayer(layer);
      }
    });

    console.log(fg.toGeoJSON());
  }

  return (
    <div>
      <MapContainer center={[1900/2, 1400/2]} zoom={-1} minZoom={-3} scrollWheelZoom={false} style={{height: '800px'}} crs={CRS.Simple} whenCreated={whenCreated} >
        <GeoJSON data={ data as GeoJsonObject } pathOptions={{color: 'blue', weight: 4}} />

        { /* <Polyline ref={ pRef as any } positions={path} color='red' pathOptions={{opacity: 0.5}}/> */}

        <ImageOverlay bounds={[[0, 0], [1900, 1400]]} url="/map.png" />
      </MapContainer>

      <button onClick={exportGeoJSON}>Export!</button>
    </div>
  );
}

export default App;
