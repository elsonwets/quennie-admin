import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Nitro turns the Start server into a deployable output; on Vercel it picks the Vercel preset itself.
import { nitro } from 'nitro/vite'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Start's entries are virtual, so the dep scanner misses these.
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'motion/react'],
  },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
})
