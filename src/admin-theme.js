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

const adminSidebarLinks = [
  { label: "Financeiro", href: "/admin/menu.html#financeiro", icon: "wallet" },
  { label: "Alunos", href: "/admin/alunos.html", icon: "users" },
  { label: "Funcionarios", href: "/admin/funcionarios.html", icon: "badge" },
  { label: "Acesso", href: "/admin/controle-acesso.html", icon: "door" },
  { label: "Alertas", href: "/admin/menu.html#alertas", icon: "bell" },
  { label: "Planos", href: "/admin/planos.html", icon: "card" },
  { label: "Config", href: "/admin/configuracoes.html", icon: "settings" },
];

const iconPaths = {
  wallet: '<path d="M3 7h18v14H3z" /><path d="M16 11h5v6h-5a3 3 0 0 1 0-6Z" /><path d="M3 7l3-4h12l3 4" />',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
  badge: '<path d="M8 7h8" /><path d="M8 11h8" /><path d="M9 15h6" /><rect x="4" y="3" width="16" height="18" rx="2" />',
  door: '<path d="M4 21h16" /><path d="M6 21V3h10v18" /><path d="M16 7h2v14" /><path d="M11 12h.01" />',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" />',
  card: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" />',
  settings: '<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 0 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21a2.1 2.1 0 0 1-4.2 0v-.08a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.05.05a2.1 2.1 0 0 1-2.97-2.97l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.66-1.1H3a2.1 2.1 0 0 1 0-4.2h.08A1.8 1.8 0 0 0 4.74 8.6a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2.1 2.1 0 0 1 7.3 3.6l.05.05a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 10.43 2.35V2.3a2.1 2.1 0 0 1 4.2 0v.08a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 0 1 2.97 2.97l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.66 1.1H22a2.1 2.1 0 0 1 0 4.2h-.08A1.8 1.8 0 0 0 19.4 15Z" />',
  menu: '<path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />',
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

function iconSvg(name) {
  return `
    <svg class="app-sidebar-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${iconPaths[name] ?? iconPaths.menu}
    </svg>
  `;
}

function setupAdminSidebar() {
  if (document.querySelector(".app-sidebar")) return;

  const storageKey = "admin-sidebar-collapsed";
  const isCollapsed = localStorage.getItem(storageKey) === "true";
  document.body.classList.add("app-has-sidebar");
  document.body.classList.toggle("app-sidebar-collapsed", isCollapsed);

  const aside = document.createElement("aside");
  aside.className = "app-sidebar";
  aside.innerHTML = `
    <div class="app-sidebar-brand">
      <span class="app-sidebar-kicker">Academia Pro</span>
      <strong class="app-sidebar-title">Admin</strong>
      <button class="app-sidebar-toggle" type="button" aria-label="Fechar menu" aria-expanded="${String(!isCollapsed)}">
        ${iconSvg("menu")}
      </button>
    </div>
    <nav class="app-sidebar-nav" aria-label="Navegacao principal do admin"></nav>
  `;

  const nav = aside.querySelector(".app-sidebar-nav");
  adminSidebarLinks.forEach(({ label, href, icon }) => {
    const link = document.createElement("a");
    link.className = "app-sidebar-link";
    link.href = appPath(href);
    link.title = label;
    link.innerHTML = `${iconSvg(icon)}<span>${label}</span>`;

    if (isActiveLink(href)) {
      link.setAttribute("aria-current", "page");
    }

    nav.append(link);
  });

  const toggle = aside.querySelector(".app-sidebar-toggle");
  toggle.addEventListener("click", () => {
    const collapsed = !document.body.classList.contains("app-sidebar-collapsed");
    document.body.classList.toggle("app-sidebar-collapsed", collapsed);
    localStorage.setItem(storageKey, String(collapsed));
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Abrir menu" : "Fechar menu");
  });

  document.body.prepend(aside);
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

setupAdminSidebar();
setupAdminContextNav();
