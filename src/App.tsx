import React from 'react';

import RoutePicker from './RoutePicker';

import './App.css';

function App() {
  return (
    <div>
      <header>
          <h1>gaine.run</h1>
          <span className="tagline">rogaine nav practice from the comfort of your browser</span>
      </header>

      <main>
        <section className="map">
          <RoutePicker />
        </section>

        <section className="sidebar">
          <div className="pane">
            <h2>route info</h2>
            <div className="divider" />

            <p>🏃 33km</p>
            <p>🎯 1000 points</p>
          </div>

          <div className="pane">
            <h2>control descriptions</h2>
            <div className="divider" />
            <p>hello</p>
          </div>
        </section>
      </main>

    </div>
  );
}

export default App;