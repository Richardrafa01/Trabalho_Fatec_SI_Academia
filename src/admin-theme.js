const theme = localStorage.getItem("admin-theme") ?? "light";

document.body.classList.toggle("professor-theme-black", theme === "black");
document.body.classList.toggle("professor-theme-light", theme !== "black");

const adminPages = {
  "/admin/cadastrar-aluno.html": "Cadastrar aluno",
  "/admin/editar-aluno.html": "Editar aluno",
  "/admin/excluir-aluno.html": "Excluir aluno",
  "/admin/historico-aluno.html": "Historico do aluno",
  "/admin/presenca-aluno.html": "Presenca do aluno",
  "/admin/renovar-matricula.html": "Renovar matricula",
  "/admin/bloquear-aluno.html": "Bloquear aluno",
  "/admin/ver-alunos.html": "Consulta de alunos",
  "/admin/cadastrar-professor.html": "Cadastrar funcionario",
  "/admin/editar-professor.html": "Editar funcionario",
  "/admin/excluir-professor.html": "Excluir funcionario",
  "/admin/ver-professores.html": "Funcionarios",
  "/admin/configuracoes.html": "Configuracoes",
};

function getActiveAdminHref() {
  const path = window.location.pathname;

  if (path === "/admin/configuracoes.html") return "/admin/configuracoes.html";
  if (path.includes("professor")) return "/admin/menu.html#professores";
  if (path.includes("bloquear") || path.includes("presenca")) return "/admin/menu.html#acesso";
  if (path.includes("renovar")) return "/admin/menu.html#financeiro";
  if (path.includes("aluno")) return "/admin/menu.html#alunos";

  return "/admin/menu.html";
}

function isActiveLink(href) {
  const url = new URL(href, window.location.origin);
  const activeUrl = new URL(getActiveAdminHref(), window.location.origin);
  return url.pathname === activeUrl.pathname && url.hash === activeUrl.hash;
}

function createNavLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;

  if (isActiveLink(href)) {
    link.setAttribute("aria-current", "page");
  }

  return link;
}

function setupAdminContextNav() {
  if (window.location.pathname === "/admin/menu.html") return;
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
  subtitle.textContent = adminPages[window.location.pathname] ?? "Area administrativa";

  titleBox.append(title, subtitle);

  const links = document.createElement("nav");
  links.className = "app-context-nav-links";
  links.setAttribute("aria-label", "Navegacao rapida do admin");

  [
    ["Menu", "/admin/menu.html"],
    ["Alunos", "/admin/menu.html#alunos"],
    ["Funcionarios", "/admin/menu.html#professores"],
    ["Financeiro", "/admin/menu.html#financeiro"],
    ["Acesso", "/admin/menu.html#acesso"],
    ["Config", "/admin/configuracoes.html"],
  ].forEach(([label, href]) => {
    links.append(createNavLink(label, href));
  });

  inner.append(titleBox, links);
  nav.append(inner);
  document.body.prepend(nav);
}

setupAdminContextNav();
