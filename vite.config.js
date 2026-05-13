import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        menu: resolve(__dirname, 'admin/menu.html'),
        cadastrarAluno: resolve(__dirname, 'admin/cadastrar-aluno.html'),
        editarAluno: resolve(__dirname, 'admin/editar-aluno.html'),
        excluirAluno: resolve(__dirname, 'admin/excluir-aluno.html'),
        historicoAluno: resolve(__dirname, 'admin/historico-aluno.html'),
        renovarMatricula: resolve(__dirname, 'admin/renovar-matricula.html'),
        vincularPlano: resolve(__dirname, 'admin/vincular-plano.html'),
        presencaAluno: resolve(__dirname, 'admin/presenca-aluno.html'),
      },
    },
  },
})
