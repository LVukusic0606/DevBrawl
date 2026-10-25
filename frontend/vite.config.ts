import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Hostnames Vite answers to besides localhost; any other Host header is blocked
const allowedHosts = ['devbrawl.xyz', 'www.devbrawl.xyz']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts,
    // Forward API calls to the backend so the frontend can use relative /api/... URLs
    proxy: {
      '/api': 'http://localhost:5287',
      // SignalR hubs (duels); ws: true forwards the WebSocket upgrade too
      '/hubs': { target: 'http://localhost:5287', ws: true },
    },
  },
  // `npm run preview` serves the production build; its proxy defaults to server.proxy above
  preview: {
    allowedHosts,
  },
})
