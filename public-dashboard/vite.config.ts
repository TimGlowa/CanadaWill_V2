import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  
  // Build configuration for Azure Static Web Apps
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    
    // Optimize bundle
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['@heroicons/react'],
          ui: ['@headlessui/react'],
        },
      },
    },
  },
  
  // Development server configuration
  server: {
    port: 3000,
    host: true, // Allow external connections
    open: true,  // Open browser on start
  },
  
  // Preview server configuration
  preview: {
    port: 3000,
    host: true,
  },
  
  // Environment variables prefix
  envPrefix: ['VITE_', 'REACT_APP_'],
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
}); 