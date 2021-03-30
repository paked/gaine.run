import React, { useState, useRef } from 'react';
import logo from './logo.svg';

import { MapContainer, ImageOverlay, Polyline, GeoJSON, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { CRS, Map, marker } from 'leaflet';

import { GeoJsonObject, Geometry, Feature, FeatureCollection, LineString, Position } from 'geojson';
import data from './geojson.json' ;

import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import PathFinder from 'geojson-path-finder-nw';

// import 'leaflet/dist/leaflet.css';
import './App.css';

const shouldPad = true;

function geojsonFromMap(m: Map): FeatureCollection {
  var fg = L.featureGroup();

  m.eachLayer((layer) => {

    if ((layer instanceof L.Path || layer instanceof L.Marker ) && layer.pm) {
      fg.addLayer(layer);
    }
  });

  let gj = fg.toGeoJSON();
  if (gj.type != "FeatureCollection") {
    throw new Error("this geojson is not a featurecollection!");
  }

  return gj;
}

type Route = [number, number][];

function padGeojson(d: FeatureCollection) : FeatureCollection {
  console.log("padding");

  d.features = d.features.map(f => {
    if (f.geometry.type != "LineString") {
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

    console.log("points", start, end);

    newroute.push(start);

    let dx = end[0] - start[0];
    let dy = end[1] - start[1];

    let dist = Math.sqrt(dx*dx + dy*dy);

    const size = 0.0002;
    const count = dist/size;
    for (let j = 0; j < count; j++) {
      newroute.push([start[0] + dx/count*j, start[1] + dy/count*j]);
    }

    if (i + 2 == route.length) {
      newroute.push(end);
    }
  }

  return newroute;
}

const padded = shouldPad ? padGeojson(data as FeatureCollection) : data as FeatureCollection;

function App() {
  // let pRef = createRef<typeof Polyline>();
  // let pf = new PathFinder(data, {precision: 1});

  let [ path, setPath ] = useState<[number, number][]>([]);

  let [ lastMarker, setLastMarker] = useState<Feature | null>(null);
  const markerRef = useRef<Feature | null>();
  markerRef.current = lastMarker;

  let [ map, setMap] = useState<Map | undefined>(undefined);
  let whenCreated = (m: Map) => {
    setMap(m);

    m.pm.addControls({
      position: 'topleft',
      drawCircle: false,
    });

    m.on('pm:create', (event: any) => {
      if (event.shape != "Marker") {
        // console.log(event.marker.toGeoJSON());
        console.info("goodbye");

        setLastMarker(null);

        return;
      };

      let point = event.marker.toGeoJSON() as Feature;
      
      console.log(markerRef.current);
      if (markerRef.current) {
        let pf = new PathFinder(geojsonFromMap(m));

        let r = pf.findPath(markerRef.current, point);
        if (!r) {
          console.error("route is null");
          setLastMarker(null);

          return;
        }

        let route: [number, number][] = r.path;
        route = route.map(l => [l[1], l[0]]);

        console.log("set route!")

        setPath(route);

        setLastMarker(null);
      }

      setLastMarker(point);
    });

  }

  console.log("hello");

  return (
    <div>
      {/* <MapContainer center={[1900/2, 1400/2]} zoom={-1} minZoom={-3} scrollWheelZoom={false} style={{height: '800px'}} crs={CRS.Simple} whenCreated={whenCreated} >
        <GeoJSON data={ data as GeoJsonObject } pathOptions={{color: 'blue', weight: 4}} />

        <Polyline ref={ pRef as any } positions={path} color='red' pathOptions={{opacity: 0.5}}/>

        <ImageOverlay bounds={[[0, 0], [1900, 1400]]} url="/map.png" />
      </MapContainer>

      <button onClick={exportGeoJSON}>Export!</button>*/}

      <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={false} style={{height: '800px'}} whenCreated={whenCreated}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

        <GeoJSON data={padded} pathOptions={{color: 'blue', weight: 4}} />

        <Polyline positions={path} color='red' pathOptions={{opacity: 0.5}}/>
      </MapContainer>

        <button onClick={() => console.log(geojsonFromMap(map!))}>Export!</button>
    </div>
  );
}

export default App;
