import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Le site est publié sur GitHub Pages sous /gofantome/ ; en local on reste à la racine.
// L'application utilise HashRouter, donc aucune réécriture d'URL n'est nécessaire côté serveur.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/gofantome/' : '/',
  plugins: [react()],
})
