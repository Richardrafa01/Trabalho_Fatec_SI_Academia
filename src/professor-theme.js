import { appPath, currentPath } from "./routes.js";

const theme = localStorage.getItem("professor-theme") ?? "light";

document.body.classList.toggle("professor-theme-black", theme === "black");
document.body.classList.toggle("professor-theme-light", theme !== "black");

const professorPages = {
  "/professor/ver-alunos.html": "Consulta de alunos",
  "/professor/historico-aluno.html": "Historico do aluno",
  "/professor/presenca-aluno.html": "Presenca do aluno",
  "/professor/configuracoes.html": "Configuracoes",
};

function getActiveProfessorHref() {
  const path = currentPath();

  if (path === "/professor/configuracoes.html") return "/professor/configuracoes.html";
  if (path.includes("presenca")) return "/professor/menu.html#aulas";
  if (path.includes("aluno")) return "/professor/menu.html#alunos";

  return "/professor/menu.html";
}

function isActiveLink(href) {
  const url = new URL(appPath(href), window.location.origin);
  const activeUrl = new URL(appPath(getActiveProfessorHref()), window.location.origin);
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

function setupProfessorContextNav() {
  if (currentPath() === "/professor/menu.html") return;
  if (document.querySelector(".app-context-nav")) return;

  const nav = document.createElement("header");
  nav.className = "app-context-nav";

  const inner = document.createElement("div");
  inner.className = "app-context-nav-inner";

  const titleBox = document.createElement("div");

  const title = document.createElement("p");
  title.className = "app-context-nav-title";
  title.textContent = "Painel do professor";

  const subtitle = document.createElement("p");
  subtitle.className = "app-context-nav-subtitle";
  subtitle.textContent = professorPages[currentPath()] ?? "Rotina de atendimento";

  titleBox.append(title, subtitle);

  const links = document.createElement("nav");
  links.className = "app-context-nav-links";
  links.setAttribute("aria-label", "Navegacao rapida do professor");

  [
    ["Menu", "/professor/menu.html"],
    ["Alunos", "/professor/menu.html#alunos"],
    ["Presencas", "/professor/menu.html#aulas"],
    ["Treinos", "/professor/menu.html#treinos"],
    ["Config", "/professor/configuracoes.html"],
  ].forEach(([label, href]) => {
    links.append(createNavLink(label, href));
  });

  inner.append(titleBox, links);
  nav.append(inner);
  document.body.prepend(nav);
}

setupProfessorContextNav();
