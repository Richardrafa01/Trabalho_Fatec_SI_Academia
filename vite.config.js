import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/Sistema-de-academia/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        menu: resolve(__dirname, 'admin/menu.html'),
        adminAlunos: resolve(__dirname, 'admin/alunos.html'),
        adminControleAcesso: resolve(__dirname, 'admin/controle-acesso.html'),
        adminFuncionarios: resolve(__dirname, 'admin/funcionarios.html'),
        adminPlanos: resolve(__dirname, 'admin/planos.html'),
        adminConfiguracoes: resolve(__dirname, 'admin/configuracoes.html'),
        menuProfessor: resolve(__dirname, 'professor/menu.html'),
        professorVerAlunos: resolve(__dirname, 'professor/ver-alunos.html'),
        professorHistoricoAluno: resolve(__dirname, 'professor/historico-aluno.html'),
        professorPresencaAluno: resolve(__dirname, 'professor/presenca-aluno.html'),
        professorConfiguracoes: resolve(__dirname, 'professor/configuracoes.html'),
        cadastrarAluno: resolve(__dirname, 'admin/cadastrar-aluno.html'),
        verAlunos: resolve(__dirname, 'admin/ver-alunos.html'),
        verProfessores: resolve(__dirname, 'admin/ver-professores.html'),
        cadastrarProfessor: resolve(__dirname, 'admin/cadastrar-professor.html'),
        editarAluno: resolve(__dirname, 'admin/editar-aluno.html'),
        editarProfessor: resolve(__dirname, 'admin/editar-professor.html'),
        excluirAluno: resolve(__dirname, 'admin/excluir-aluno.html'),
        excluirProfessor: resolve(__dirname, 'admin/excluir-professor.html'),
        historicoAluno: resolve(__dirname, 'admin/historico-aluno.html'),
        renovarMatricula: resolve(__dirname, 'admin/renovar-matricula.html'),
        presencaAluno: resolve(__dirname, 'admin/presenca-aluno.html'),
        bloquearAluno: resolve(__dirname, 'admin/bloquear-aluno.html'),
      },
    },
  },
})
