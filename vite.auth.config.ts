import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], base:'/', build:{ outDir:'dist-login', assetsDir:'login-assets', rollupOptions:{ input:'login.html' } } });
