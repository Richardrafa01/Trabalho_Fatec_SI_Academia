import { supabase } from "./supabase.js";

const email = document.querySelector("#user-email");
const logoutButton = document.querySelector("#logout-button");
const passwordAlert = document.querySelector("#password-alert");
const passwordSection = document.querySelector("#password-section");
const passwordForm = document.querySelector("#password-form");
const passwordMessage = document.querySelector("#password-message");
const passwordSuccess = document.querySelector("#password-success");
const newPasswordInput = document.querySelector("#new-password");
const confirmPasswordInput = document.querySelector("#confirm-password");
const todayLabel = document.querySelector("#today-label");
const profAlunosAtivos = document.querySelector("#prof-alunos-ativos");
const profAcessosHoje = document.querySelector("#prof-acessos-hoje");
const profVencendo = document.querySelector("#prof-vencendo");
const profStatus = document.querySelector("#prof-status");
const profAlunosLista = document.querySelector("#prof-alunos-lista");

const { data } = await supabase.auth.getSession();
const params = new URLSearchParams(window.location.search);

if (!data.session) {
  window.location.href = "/";
} else if (email) {
  email.textContent = `Acesso: ${data.session.user.email}`;
}

if (params.get("senha") === "alterada" && passwordSuccess) {
  passwordSuccess.textContent = "Senha alterada. Acesso liberado.";
  passwordSuccess.classList.remove("hidden");
  window.history.replaceState({}, "", "/professor/menu.html");
}

function todayAsDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTomorrow() {
  const today = todayAsDate();
  today.setDate(today.getDate() + 1);
  return toInputDate(today);
}

function getSevenDaysFromNow() {
  const today = todayAsDate();
  today.setDate(today.getDate() + 7);
  return toInputDate(today);
}

function formatDateBR(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function showPasswordMessage(text, type = "success") {
  if (!passwordMessage) return;

  passwordMessage.textContent = text;
  passwordMessage.className =
    type === "success"
      ? "mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
      : "mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
}

async function loadProfessorProfile() {
  if (!data.session) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tipo_usuario, precisa_trocar_senha, status")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (profile?.tipo_usuario !== "PROFESSOR") {
    window.location.href = "/admin/menu.html";
    return;
  }

  if (profile.status === "INATIVO") {
    await supabase.auth.signOut();
    window.location.href = "/";
    return;
  }

  const precisaTrocarSenha = Boolean(profile?.precisa_trocar_senha);
  passwordAlert?.classList.toggle("hidden", !precisaTrocarSenha);
  passwordSection?.classList.toggle("hidden", !precisaTrocarSenha);
  setText(profStatus, profile?.status === "INATIVO" ? "Inativo" : "Ativo");
}

await loadProfessorProfile();

async function loadProfessorDashboard() {
  const today = toInputDate(todayAsDate());
  const tomorrow = getTomorrow();
  const sevenDays = getSevenDaysFromNow();

  setText(todayLabel, new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }));

  const { count: alunosAtivos } = await supabase
    .from("alunos")
    .select("*", { count: "exact", head: true })
    .eq("status", "ATIVO");

  const { count: acessosHoje } = await supabase
    .from("acessos_catraca")
    .select("*", { count: "exact", head: true })
    .gte("registrado_em", today)
    .lt("registrado_em", tomorrow);

  const { data: vencendo } = await supabase
    .from("alunos")
    .select("id")
    .eq("status", "ATIVO")
    .gte("validade_matricula", today)
    .lte("validade_matricula", sevenDays);

  const { data: alunosRecentes, error: alunosError } = await supabase
    .from("alunos")
    .select("id, nome_completo, email, plano, validade_matricula, status")
    .order("created_at", { ascending: false })
    .limit(4);

  setText(profAlunosAtivos, String(alunosAtivos ?? 0));
  setText(profAcessosHoje, String(acessosHoje ?? 0));
  setText(profVencendo, String(vencendo?.length ?? 0));

  if (!profAlunosLista) return;

  profAlunosLista.innerHTML = "";

  if (alunosError) {
    profAlunosLista.innerHTML = `
      <div class="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700 lg:col-span-2">
        Nao foi possivel carregar os alunos no momento.
      </div>
    `;
    return;
  }

  if (!alunosRecentes?.length) {
    profAlunosLista.innerHTML = `
      <div class="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500 lg:col-span-2">
        Nenhum aluno cadastrado ainda.
      </div>
    `;
    return;
  }

  alunosRecentes.forEach((aluno) => {
    const card = document.createElement("article");
    const statusClass = aluno.status === "ATIVO"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-600";

    card.className = "rounded-md border border-slate-200 p-4";
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-bold text-slate-950"></h3>
          <p class="mt-1 text-sm text-slate-600"></p>
        </div>
        <span class="rounded-md px-2 py-1 text-xs font-bold ${statusClass}"></span>
      </div>
      <p class="mt-3 text-sm text-slate-600"></p>
      <a class="mt-4 inline-flex rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-orange-700 hover:border-orange-300 hover:bg-orange-50" href="/professor/historico-aluno.html?id=${aluno.id}">
        Ver historico
      </a>
    `;

    card.querySelector("h3").textContent = aluno.nome_completo ?? "Aluno sem nome";
    card.querySelector("p").textContent = aluno.email ?? "Sem e-mail";
    card.querySelector("span").textContent = aluno.status ?? "-";
    card.querySelectorAll("p")[1].textContent = `Plano: ${aluno.plano ?? "-"} | Vencimento: ${formatDateBR(aluno.validade_matricula)}`;
    profAlunosLista.append(card);
  });
}

await loadProfessorDashboard();

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const newPassword = newPasswordInput?.value ?? "";
  const confirmPassword = confirmPasswordInput?.value ?? "";

  if (newPassword.length < 6) {
    showPasswordMessage("A nova senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showPasswordMessage("As senhas nao conferem.", "error");
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
    showPasswordMessage("Nao foi possivel alterar a senha. Confira os dados e tente novamente.", "error");
    if (button) {
      button.disabled = false;
      button.textContent = "Salvar nova senha";
      button.classList.remove("cursor-not-allowed", "opacity-70");
    }
    return;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      precisa_trocar_senha: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.session.user.id);

  if (profileError) {
    showPasswordMessage("Senha alterada, mas nao foi possivel atualizar seu perfil. Tente novamente.", "error");
    if (button) {
      button.disabled = false;
      button.textContent = "Salvar nova senha";
      button.classList.remove("cursor-not-allowed", "opacity-70");
    }
    return;
  }

  passwordForm.reset();
  window.location.href = "/professor/menu.html?senha=alterada";
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
});
