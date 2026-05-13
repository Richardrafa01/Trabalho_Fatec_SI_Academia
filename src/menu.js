import { supabase } from "./supabase.js";

const email = document.querySelector("#user-email");
const logoutButton = document.querySelector("#logout-button");
const totalAlunos = document.querySelector("#total-alunos");
const alunosAtivos = document.querySelector("#alunos-ativos");

const { data } = await supabase.auth.getSession();

if (!data.session) {
  window.location.href = "/";
} else {
  email.textContent = `Admin logado: ${data.session.user.email}`;
}

const { count: total } = await supabase
  .from("alunos")
  .select("*", { count: "exact", head: true });

const { count: ativos } = await supabase
  .from("alunos")
  .select("*", { count: "exact", head: true })
  .eq("status", "ATIVO");

if (totalAlunos) totalAlunos.textContent = total ?? 0;
if (alunosAtivos) alunosAtivos.textContent = ativos ?? 0;

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
});
