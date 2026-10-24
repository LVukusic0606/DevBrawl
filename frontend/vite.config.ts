import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the backend so the frontend can use relative /api/... URLs
    proxy: {
      '/api': 'http://localhost:5287',
      // SignalR hubs (duels); ws: true forwards the WebSocket upgrade too
      '/hubs': { target: 'http://localhost:5287', ws: true },
    },
  },
})
