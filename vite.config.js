import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
    plugins: [basicSsl(), cloudflare()],
    server: {
        host: true,
        allowedHosts: true,
        cors: true,
        proxy: {
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true
            }
        }
    }
});