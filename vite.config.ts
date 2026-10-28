import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nowPlayingPlugin } from './server/nowPlayingPlugin'

export default defineConfig({
  plugins: [react(), nowPlayingPlugin()],
  server: {
    port: 3000,
    host: true
  }
})
