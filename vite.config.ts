import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@tanstack') || id.includes('@supabase') || id.includes('idb')) return 'vendor-data'
          if (id.includes('recharts')) return 'vendor-recharts'
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-chartjs'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('@dnd-kit')) return 'vendor-dnd'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
