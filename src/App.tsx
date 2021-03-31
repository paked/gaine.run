import React, { useState, useRef } from 'react';
import logo from './logo.svg';

import { MapContainer, ImageOverlay, Polyline, GeoJSON, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { CRS, Map, marker } from 'leaflet';

import { GeoJsonObject, Geometry, Feature, FeatureCollection, LineString, Position } from 'geojson';
import data from './geojson.json' ;

import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import PathFinder from 'geojson-path-finder-nw';

import './App.css';

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

function padGeojson(d: FeatureCollection) : FeatureCollection {
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

    newroute.push(start);

    let dx = end[0] - start[0];
    let dy = end[1] - start[1];

    let dist = Math.sqrt(dx*dx + dy*dy);

    const size = 5;
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

const shouldPad = true;
const padded = shouldPad ? padGeojson(data as FeatureCollection) : data as FeatureCollection;

function App() {
  let [ path, setPath ] = useState<[number, number][]>([]);

  let [ lastMarker, setLastMarker] = useState<Feature | null>(null);
  const markerRef = useRef<Feature | null>();
  markerRef.current = lastMarker;

  let [ map, setMap] = useState<Map | undefined>(undefined);
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

    let Toolbar = (m.pm as any).Toolbar;

    // Toolbar.copyDrawControl('Marker', {
    //   name: "PlotRoute",
    //   jsClass: "PlotRoute",
    //   afterClick: (e: any, ctx: any) => {
    //     console.log("hello")
    //     console.log((m.pm.Draw as any)[ctx.button._button.jsClass]);
    //     // toggle drawing mode
    //     (m.pm.Draw as any)[ctx.button._button.jsClass].toggle();
    //   },
    //   block: "draw",
    //   title: "Plot a route",
    //   doToggle: true,
    //   toggleStatus: false,
    //   disableOtherButtons: true,
    // });

    m.on('pm:create', (event: any) => {
      if (event.shape != "Marker") {
        setLastMarker(null);

        return;
      };

      let point = event.marker.toGeoJSON() as Feature;
      
      console.log(markerRef.current);
      if (markerRef.current) {
        let pf = new PathFinder(geojsonFromMap(m));

        let r = pf.findPath(markerRef.current, point);
        if (!r) {
          setLastMarker(null);

          return;
        }

        let route: [number, number][] = r.path;
        route = route.map(l => [l[1], l[0]]);

        setPath(route);

        setLastMarker(null);
      }

      setLastMarker(point);
    });

  }

  return (
    <div>
      <MapContainer center={[1900/2, 1400/2]} zoom={-1} minZoom={-3} maxZoom={3} scrollWheelZoom={false} style={{height: '800px'}} crs={CRS.Simple} whenCreated={whenCreated} >
        <GeoJSON data={ padded } pathOptions={{color: 'blue', weight: 4}} />

        <Polyline positions={path} color='red' pathOptions={{opacity: 0.5}}/>

        <ImageOverlay bounds={[[0, 0], [1900, 1400]]} url="/map.png" />
      </MapContainer>

        <button onClick={() => console.log(geojsonFromMap(map!))}>Export!</button>
    </div>
  );
}

export default App;
