import { supabase } from "./supabase.js";
import { appPath } from "./routes.js";

const form = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const button = document.querySelector("#login-button");
const message = document.querySelector("#login-message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className =
    type === "success"
      ? "mt-4 text-center text-sm font-semibold text-emerald-600"
      : "mt-4 text-center text-sm font-semibold text-red-600";
}

async function getRedirectByProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return appPath("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tipo_usuario")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.tipo_usuario === "PROFESSOR") return appPath("/professor/menu.html");
  return appPath("/admin/menu.html");
}

const { data } = await supabase.auth.getSession();

if (data.session) {
  window.location.href = await getRedirectByProfile();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  button.disabled = true;
  button.textContent = "Entrando...";
  button.classList.add("cursor-not-allowed", "opacity-70");
  showMessage("Validando acesso...", "success");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showMessage("E-mail ou senha incorretos.");
    button.disabled = false;
    button.textContent = "Entrar";
    button.classList.remove("cursor-not-allowed", "opacity-70");
    return;
  }

  showMessage("Login realizado com sucesso.", "success");
  window.location.href = await getRedirectByProfile();
});
