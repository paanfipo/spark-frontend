// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'; // <<< 1. IMPORTA
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <<< 2. ENVUELVE LA APP */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)