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
const professorFields = {
  nome: document.querySelector("#professor-nome"),
  email: document.querySelector("#professor-email"),
  telefone: document.querySelector("#professor-telefone"),
  cpf: document.querySelector("#professor-cpf"),
  especialidade: document.querySelector("#professor-especialidade"),
  cref: document.querySelector("#professor-cref"),
  horarios: document.querySelector("#professor-horarios"),
  status: document.querySelector("#professor-status"),
  created: document.querySelector("#professor-created"),
};

const { data } = await supabase.auth.getSession();

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

function applyTheme(theme) {
  const isDark = theme === "black";
  document.body.classList.toggle("professor-theme-black", isDark);
  document.body.classList.toggle("professor-theme-light", !isDark);

  themeLight?.classList.toggle("ring-4", !isDark);
  themeLight?.classList.toggle("ring-orange-600/20", !isDark);
  themeDark?.classList.toggle("ring-4", isDark);
  themeDark?.classList.toggle("ring-orange-600/20", isDark);
}

const savedTheme = localStorage.getItem("professor-theme") ?? "light";
applyTheme(savedTheme);

async function protectAndLoadProfile() {
  if (!data.session) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("nome, nome_completo, email, tipo_usuario, status")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (error) {
    showMessage("Nao foi possivel carregar seu perfil. Tente novamente.", "error");
    return;
  }

  if (profile?.tipo_usuario !== "PROFESSOR") {
    navigate("/admin/menu.html");
    return;
  }

  if (profile.status === "INATIVO") {
    await supabase.auth.signOut();
    navigate("/");
    return;
  }

  setText(profileName, profile.nome_completo || profile.nome);
  setText(profileEmail, profile.email || data.session.user.email);
  setText(profileType, "Professor");
  setText(profileStatus, profile.status === "INATIVO" ? "Inativo" : "Ativo");
}

await protectAndLoadProfile();

async function loadPersonalData() {
  if (!data.session) return;

  const { data: professor, error } = await supabase
    .from("professores")
    .select("nome_completo, email, telefone, cpf, especialidade, cref, horarios, status, created_at")
    .eq("profile_id", data.session.user.id)
    .maybeSingle();

  if (error) {
    showMessage("Nao foi possivel carregar seus dados pessoais. Tente novamente.", "error");
    return;
  }

  if (!professor) {
    showMessage("Nenhum cadastro de professor vinculado a este acesso.", "error");
    return;
  }

  setText(professorFields.nome, professor.nome_completo);
  setText(professorFields.email, professor.email);
  setText(professorFields.telefone, professor.telefone || "Sem telefone");
  setText(professorFields.cpf, professor.cpf);
  setText(professorFields.especialidade, professor.especialidade);
  setText(professorFields.cref, professor.cref || "Nao informado");
  setText(professorFields.horarios, professor.horarios || "Nao informado");
  setText(professorFields.status, professor.status);
  setText(
    professorFields.created,
    professor.created_at ? new Date(professor.created_at).toLocaleString("pt-BR") : "-",
  );

  personalDataSection?.classList.remove("hidden");
}

themeLight?.addEventListener("click", () => {
  localStorage.setItem("professor-theme", "light");
  applyTheme("light");
});

themeDark?.addEventListener("click", () => {
  localStorage.setItem("professor-theme", "black");
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

  if (button) {
    button.disabled = false;
    button.textContent = "Salvar nova senha";
    button.classList.remove("cursor-not-allowed", "opacity-70");
  }

  if (error) {
    showMessage("Nao foi possivel alterar a senha. Confira os dados e tente novamente.", "error");
    return;
  }

  passwordForm.reset();
  showMessage("Senha alterada com sucesso.");
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  navigate("/");
});
