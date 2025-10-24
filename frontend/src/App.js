import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:30001/api/mensaje')
      .then(res => res.json())
      .then(data => {
        setMensaje(data.mensaje);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Mi App en Kubernetes prueba cambio 2 ddd rrr pp</h1>
        {loading ? <p>Cargando...</p> : <p>{mensaje}</p>}
      </header>
    </div>
  );
}

export default App;