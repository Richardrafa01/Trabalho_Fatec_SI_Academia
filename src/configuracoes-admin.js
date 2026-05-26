import { supabase } from "./supabase.js";
import { navigate } from "./routes.js";

const logoutButton = document.querySelector("#logout-button");
const message = document.querySelector("#message");
const passwordForm = document.querySelector("#password-form");
const newPasswordInput = document.querySelector("#new-password");
const confirmPasswordInput = document.querySelector("#confirm-password");
const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const profileType = document.querySelector("#profile-type");
const profileStatus = document.querySelector("#profile-status");
const themeLight = document.querySelector("#theme-light");
const themeDark = document.querySelector("#theme-dark");
const personalDataButton = document.querySelector("#personal-data-button");
const personalDataSection = document.querySelector("#personal-data-section");
const closePersonalData = document.querySelector("#close-personal-data");
const adminFields = {
  nome: document.querySelector("#admin-nome"),
  email: document.querySelector("#admin-email"),
  tipo: document.querySelector("#admin-tipo"),
  trocarSenha: document.querySelector("#admin-trocar-senha"),
  status: document.querySelector("#admin-status"),
  created: document.querySelector("#admin-created"),
  updated: document.querySelector("#admin-updated"),
};

const { data } = await supabase.auth.getSession();
let currentProfile = null;

if (!data.session) {
  navigate("/");
}

function showMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text;
  message.className =
    type === "success"
      ? "mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
      : "mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
}

function setText(element, value) {
  if (element) element.textContent = value ?? "-";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

function applyTheme(theme) {
  const isDark = theme === "black";
  document.body.classList.toggle("professor-theme-black", isDark);
  document.body.classList.toggle("professor-theme-light", !isDark);

  themeLight?.classList.toggle("ring-4", !isDark);
  themeLight?.classList.toggle("ring-orange-600/20", !isDark);
  themeDark?.classList.toggle("ring-4", isDark);
  themeDark?.classList.toggle("ring-orange-600/20", isDark);
}

const savedTheme = localStorage.getItem("admin-theme") ?? "light";
applyTheme(savedTheme);

async function protectAndLoadProfile() {
  if (!data.session) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("nome, nome_completo, email, tipo_usuario, precisa_trocar_senha, status, created_at, updated_at")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (error) {
    showMessage("Nao foi possivel carregar seu perfil. Tente novamente.", "error");
    return;
  }

  if (profile?.tipo_usuario === "PROFESSOR") {
    navigate("/professor/menu.html");
    return;
  }

  if (profile?.tipo_usuario !== "ADMIN" || profile.status === "INATIVO") {
    await supabase.auth.signOut();
    navigate("/");
    return;
  }

  currentProfile = profile;

  setText(profileName, profile.nome_completo || profile.nome);
  setText(profileEmail, profile.email || data.session.user.email);
  setText(profileType, "Administrador");
  setText(profileStatus, profile.status === "INATIVO" ? "Inativo" : "Ativo");
}

await protectAndLoadProfile();

function loadPersonalData() {
  if (!currentProfile) {
    showMessage("Nenhum perfil de administrador encontrado.", "error");
    return;
  }

  setText(adminFields.nome, currentProfile.nome_completo || currentProfile.nome);
  setText(adminFields.email, currentProfile.email || data.session.user.email);
  setText(adminFields.tipo, "Administrador");
  setText(adminFields.trocarSenha, currentProfile.precisa_trocar_senha ? "Sim" : "Nao");
  setText(adminFields.status, currentProfile.status === "INATIVO" ? "Inativo" : "Ativo");
  setText(adminFields.created, formatDate(currentProfile.created_at));
  setText(adminFields.updated, formatDate(currentProfile.updated_at));

  personalDataSection?.classList.remove("hidden");
}

themeLight?.addEventListener("click", () => {
  localStorage.setItem("admin-theme", "light");
  applyTheme("light");
});

themeDark?.addEventListener("click", () => {
  localStorage.setItem("admin-theme", "black");
  applyTheme("black");
});

personalDataButton?.addEventListener("click", loadPersonalData);

closePersonalData?.addEventListener("click", () => {
  personalDataSection?.classList.add("hidden");
});

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const newPassword = newPasswordInput?.value ?? "";
  const confirmPassword = confirmPasswordInput?.value ?? "";

  if (newPassword.length < 6) {
    showMessage("A nova senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage("As senhas nao conferem.", "error");
    return;
  }

  const button = passwordForm.querySelector("button");
  if (button) {
    button.disabled = true;
    button.textContent = "Salvando...";
    button.classList.add("cursor-not-allowed", "opacity-70");
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    if (button) {
      button.disabled = false;
      button.textContent = "Salvar nova senha";
      button.classList.remove("cursor-not-allowed", "opacity-70");
    }
    showMessage("Nao foi possivel alterar a senha. Confira os dados e tente novamente.", "error");
    return;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      precisa_trocar_senha: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.session.user.id);

  if (button) {
    button.disabled = false;
    button.textContent = "Salvar nova senha";
    button.classList.remove("cursor-not-allowed", "opacity-70");
  }

  if (profileError) {
    showMessage("Senha alterada, mas nao foi possivel atualizar o perfil. Tente novamente.", "error");
    return;
  }

  if (currentProfile) {
    currentProfile.precisa_trocar_senha = false;
    currentProfile.updated_at = new Date().toISOString();
  }

  passwordForm.reset();
  showMessage("Senha alterada com sucesso.");
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  navigate("/");
});
