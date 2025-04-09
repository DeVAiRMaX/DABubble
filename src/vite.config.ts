import { defineConfig } from 'vite';


export default defineConfig({
  optimizeDeps: {
    exclude: ['emoji-picker-element']
  }
});
