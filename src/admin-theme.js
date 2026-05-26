import { appPath, currentPath } from "./routes.js";

const theme = localStorage.getItem("admin-theme") ?? "light";

document.body.classList.toggle("professor-theme-black", theme === "black");
document.body.classList.toggle("professor-theme-light", theme !== "black");

const adminPages = {
  "/admin/cadastrar-aluno.html": "Cadastrar aluno",
  "/admin/alunos.html": "Alunos",
  "/admin/editar-aluno.html": "Editar aluno",
  "/admin/excluir-aluno.html": "Excluir aluno",
  "/admin/historico-aluno.html": "Histórico do aluno",
  "/admin/presenca-aluno.html": "Presença do aluno",
  "/admin/renovar-matricula.html": "Renovar matrícula",
  "/admin/bloquear-aluno.html": "Bloquear aluno",
  "/admin/controle-acesso.html": "Controle de acesso",
  "/admin/planos.html": "Planos",
  "/admin/ver-alunos.html": "Consulta de alunos",
  "/admin/cadastrar-professor.html": "Cadastrar funcionário",
  "/admin/funcionarios.html": "Funcionários",
  "/admin/editar-professor.html": "Editar funcionário",
  "/admin/excluir-professor.html": "Excluir funcionário",
  "/admin/ver-professores.html": "Funcionários",
  "/admin/configuracoes.html": "Configurações",
};

function getActiveAdminHref() {
  const path = currentPath();

  if (path === "/admin/configuracoes.html") return "/admin/configuracoes.html";
  if (path === "/admin/controle-acesso.html") return "/admin/controle-acesso.html";
  if (path === "/admin/planos.html") return "/admin/planos.html";
  if (path === "/admin/alunos.html") return "/admin/alunos.html";
  if (path === "/admin/funcionarios.html") return "/admin/funcionarios.html";
  if (path.includes("professor")) return "/admin/funcionarios.html";
  if (path.includes("bloquear") || path.includes("presenca")) return "/admin/controle-acesso.html";
  if (path.includes("renovar")) return "/admin/menu.html#financeiro";
  if (path.includes("aluno")) return "/admin/alunos.html";

  return "/admin/menu.html";
}

function isActiveLink(href) {
  const url = new URL(appPath(href), window.location.origin);
  const activeUrl = new URL(appPath(getActiveAdminHref()), window.location.origin);
  return url.pathname === activeUrl.pathname && url.hash === activeUrl.hash;
}

function createNavLink(label, href) {
  const link = document.createElement("a");
  link.href = appPath(href);
  link.textContent = label;

  if (isActiveLink(href)) {
    link.setAttribute("aria-current", "page");
  }

  return link;
}

function setupAdminContextNav() {
  if (currentPath() === "/admin/menu.html") return;
  if (document.querySelector(".app-context-nav")) return;

  const nav = document.createElement("header");
  nav.className = "app-context-nav";

  const inner = document.createElement("div");
  inner.className = "app-context-nav-inner";

  const titleBox = document.createElement("div");

  const title = document.createElement("p");
  title.className = "app-context-nav-title";
  title.textContent = "Painel administrativo";

  const subtitle = document.createElement("p");
  subtitle.className = "app-context-nav-subtitle";
  subtitle.textContent = adminPages[currentPath()] ?? "Área administrativa";

  titleBox.append(title, subtitle);

  const links = document.createElement("nav");
  links.className = "app-context-nav-links";
  links.setAttribute("aria-label", "Navegação rápida do admin");

  [
    ["Menu", "/admin/menu.html"],
    ["Alunos", "/admin/alunos.html"],
    ["Funcionários", "/admin/funcionarios.html"],
    ["Financeiro", "/admin/menu.html#financeiro"],
    ["Acesso", "/admin/controle-acesso.html"],
    ["Planos", "/admin/planos.html"],
    ["Config", "/admin/configuracoes.html"],
  ].forEach(([label, href]) => {
    links.append(createNavLink(label, href));
  });

  inner.append(titleBox, links);
  nav.append(inner);
  document.body.prepend(nav);
}

setupAdminContextNav();
