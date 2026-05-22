import { supabase } from "./supabase.js";

const page = document.body.dataset.page;
const message = document.querySelector("#message");
const professorForm = document.querySelector("#professor-form");
const professorSelect = document.querySelector("#professor-id");
const emptyState = document.querySelector("#empty-state");
const professorSearch = document.querySelector("#professor-search");
const professorResults = document.querySelector("#professor-results");
const professorSelected = document.querySelector("#professor-selected");
const deleteProfessorButton = document.querySelector("#delete-professor-button");
const createAccessButton = document.querySelector("#create-access-button");
const professoresCards = document.querySelector("#professores-cards");
const backofficeRoles = ["ADMIN", "GERENTE"];

function showMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text;
  message.className =
    type === "success"
      ? "rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
      : "rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
}

async function protectPage() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "/";
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tipo_usuario, status")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (profile?.tipo_usuario === "PROFESSOR") {
    window.location.href = "/professor/menu.html";
    return false;
  }

  if (!backofficeRoles.includes(profile?.tipo_usuario) || profile?.status === "INATIVO") {
    await supabase.auth.signOut();
    window.location.href = "/";
    return false;
  }

  return true;
}

async function getProfessores({ ativosOnly = false } = {}) {
  let query = supabase
    .from("professores")
    .select("*");

  if (ativosOnly) {
    query = query.eq("status", "ATIVO");
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    showMessage("Nao foi possivel carregar os funcionarios. Tente novamente.", "error");
    return [];
  }

  return data ?? [];
}

function professorLabel(professor) {
  const status = professor.status ? ` - ${professor.status}` : "";
  const cargo = professor.cargo ? ` - ${professor.cargo}` : "";
  return `${professor.nome_completo ?? "Funcionario sem nome"}${cargo}${professor.email ? ` - ${professor.email}` : ""}${status}`;
}

function normalizeText(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function professorResumo(professor) {
  return [
    professor.cargo,
    professor.perfil_acesso ? `Perfil: ${perfilLabel(professor.perfil_acesso)}` : null,
    professor.email,
    professor.telefone,
    professor.especialidade ? `Area: ${professor.especialidade}` : null,
    professor.status ? `Status: ${professor.status}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function perfilLabel(perfil) {
  const labels = {
    ADMIN: "Admin",
    GERENTE: "Gerente",
    ADMINISTRATIVO: "Administrativo",
    RECEPCAO: "Recepcao",
    PROFESSOR: "Professor",
  };

  return labels[perfil] ?? perfil ?? "-";
}

function buscarProfessoresPorInicio(professores, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return [];

  return professores.filter((professor) =>
    normalizeText(professor.nome_completo).startsWith(normalizedTerm),
  );
}

function renderProfessorResults(professores, onSelect) {
  if (!professorResults || !professorSearch) return;

  professorResults.innerHTML = "";

  if (!professorSearch.value.trim()) {
    professorResults.classList.add("hidden");
    return;
  }

  if (professores.length === 0) {
    const empty = document.createElement("p");
    empty.className = "px-4 py-3 text-sm text-slate-500";
    empty.textContent = "Nenhum funcionario encontrado.";
    professorResults.append(empty);
    professorResults.classList.remove("hidden");
    return;
  }

  professores.forEach((professor) => {
    const button = document.createElement("button");
    button.className = "block w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-orange-50";
    button.type = "button";

    const name = document.createElement("strong");
    name.className = "block text-slate-950";
    name.textContent = professor.nome_completo ?? "Funcionario sem nome";

    const meta = document.createElement("span");
    meta.className = "mt-1 block text-xs text-slate-500";
    meta.textContent = professorResumo(professor);

    button.append(name, meta);
    button.addEventListener("click", () => {
      if (professorSelect) professorSelect.value = professor.id;
      professorSearch.value = professorLabel(professor);
      professorResults.classList.add("hidden");
      onSelect(professor);
    });

    professorResults.append(button);
  });

  professorResults.classList.remove("hidden");
}

function setupProfessorSearch(professores, onSelect) {
  if (!professorSearch) return;

  professorSearch.addEventListener("input", () => {
    if (professorSelect) professorSelect.value = "";
    renderProfessorResults(buscarProfessoresPorInicio(professores, professorSearch.value), onSelect);
  });
}

async function fillSelect() {
  if (!professorSelect) return [];

  const professores = await getProfessores();
  professorSelect.innerHTML = '<option value="">Selecione um funcionario</option>';

  professores.forEach((professor) => {
    const option = document.createElement("option");
    option.value = professor.id;
    option.textContent = professorLabel(professor);
    professorSelect.append(option);
  });

  if (emptyState) {
    emptyState.classList.toggle("hidden", professores.length > 0);
  }

  return professores;
}

function renderProfessorCards(professores) {
  if (!professoresCards) return;

  professoresCards.innerHTML = "";

  if (!professores.length) {
    professoresCards.innerHTML = `
      <div class="rounded-md border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 sm:col-span-2">
        Nenhum funcionario ativo encontrado.
      </div>
    `;
    return;
  }

  professores.forEach((professor) => {
    const card = document.createElement("article");
    card.className = "rounded-md border border-slate-200 p-4";
    card.innerHTML = `
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-950"></h2>
          <p class="mt-1 text-sm text-slate-600"></p>
        </div>
        <span class="w-fit rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Ativo</span>
      </div>
      <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="font-bold text-slate-500">Cargo</dt>
          <dd class="mt-1 text-slate-800" data-field="cargo"></dd>
        </div>
        <div>
          <dt class="font-bold text-slate-500">Perfil</dt>
          <dd class="mt-1 text-slate-800" data-field="perfil"></dd>
        </div>
        <div>
          <dt class="font-bold text-slate-500">Area</dt>
          <dd class="mt-1 text-slate-800" data-field="especialidade"></dd>
        </div>
        <div>
          <dt class="font-bold text-slate-500">Telefone</dt>
          <dd class="mt-1 text-slate-800" data-field="telefone"></dd>
        </div>
        <div>
          <dt class="font-bold text-slate-500">CREF</dt>
          <dd class="mt-1 text-slate-800" data-field="cref"></dd>
        </div>
        <div>
          <dt class="font-bold text-slate-500">Horarios</dt>
          <dd class="mt-1 text-slate-800" data-field="horarios"></dd>
        </div>
      </dl>
      <a class="mt-4 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-orange-700 hover:border-orange-300 hover:bg-orange-50" href="/admin/editar-professor.html?id=${professor.id}">
        Editar dados
      </a>
    `;

    card.querySelector("h2").textContent = professor.nome_completo ?? "Funcionario sem nome";
    card.querySelector("p").textContent = professor.email ?? "Sem e-mail";
    card.querySelector('[data-field="cargo"]').textContent = professor.cargo ?? "Professor de musculacao";
    card.querySelector('[data-field="perfil"]').textContent = perfilLabel(professor.perfil_acesso ?? "PROFESSOR");
    card.querySelector('[data-field="especialidade"]').textContent = professor.especialidade ?? "Nao informado";
    card.querySelector('[data-field="telefone"]').textContent = professor.telefone ?? "Sem telefone";
    card.querySelector('[data-field="cref"]').textContent = professor.cref ?? "Nao informado";
    card.querySelector('[data-field="horarios"]').textContent = professor.horarios ?? "Nao informado";

    professoresCards.append(card);
  });
}

async function setupView() {
  const professores = await getProfessores({ ativosOnly: true });

  if (emptyState) {
    emptyState.classList.toggle("hidden", professores.length > 0);
  }

  const applyFilter = () => {
    const search = professorSearch?.value.trim().toLowerCase() ?? "";
    const filtered = search
      ? professores.filter((professor) => professor.nome_completo?.toLowerCase().startsWith(search))
      : professores;

    renderProfessorCards(filtered);
  };

  professorSearch?.addEventListener("input", applyFilter);
  applyFilter();
}

function formToProfessor(form) {
  const formData = new FormData(form);

  return {
    nome_completo: formData.get("nome_completo")?.trim(),
    email: formData.get("email")?.trim(),
    telefone: formData.get("telefone")?.trim() || null,
    cpf: formData.get("cpf")?.trim(),
    data_nascimento: formData.get("data_nascimento") || null,
    cargo: formData.get("cargo") || "Professor de musculacao",
    perfil_acesso: formData.get("perfil_acesso") || "PROFESSOR",
    especialidade: formData.get("especialidade")?.trim(),
    cref: formData.get("cref")?.trim() || null,
    valor_hora: formData.get("valor_hora") ? Number(formData.get("valor_hora")) : null,
    horarios: formData.get("horarios")?.trim() || null,
    observacoes: formData.get("observacoes")?.trim() || null,
    status: formData.get("status") || "ATIVO",
  };
}

async function accessErrorMessage(accessError, acesso) {
  if (accessError?.message?.includes("Failed to send a request")) {
    return "nao foi possivel criar o acesso automaticamente. Tente novamente ou acione o suporte tecnico.";
  }

  if (accessError?.context) {
    try {
      const payload = await accessError.context.json();
      if (payload?.error) return payload.error;
    } catch {
      try {
        const text = await accessError.context.text();
        if (text) return "nao foi possivel criar o acesso automaticamente. Tente novamente ou acione o suporte tecnico.";
      } catch {
        return "nao foi possivel criar o acesso automaticamente. Tente novamente ou acione o suporte tecnico.";
      }
    }
  }

  return acesso?.error ?? "nao foi possivel criar o acesso automaticamente. Tente novamente ou acione o suporte tecnico.";
}

async function criarAcessoProfessor(professor) {
  const { data: acesso, error: accessError } = await supabase.functions.invoke("criar-acesso-professor", {
    body: {
      professor_id: professor.id,
      nome_completo: professor.nome_completo,
      email: professor.email,
      perfil_acesso: professor.perfil_acesso,
      cargo: professor.cargo,
    },
  });

  if (accessError || acesso?.error) {
    return {
      error: await accessErrorMessage(accessError, acesso),
    };
  }

  return {
    data: acesso,
  };
}

function setupCreate() {
  professorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const professor = formToProfessor(professorForm);
    const { data: novoProfessor, error } = await supabase
      .from("professores")
      .insert(professor)
      .select("id, nome_completo, email, cargo, perfil_acesso")
      .single();

    if (error) {
      showMessage("Nao foi possivel cadastrar o funcionario. Confira os dados e tente novamente.", "error");
      return;
    }

    const { data: acesso, error: accessError } = await criarAcessoProfessor(novoProfessor);

    if (accessError) {
      showMessage(
        `Funcionario cadastrado, mas o acesso nao foi criado: ${accessError}`,
        "error",
      );
      return;
    }

    professorForm.reset();
    showMessage(
      acesso?.email_sent
        ? "Funcionario cadastrado, acesso criado e e-mail enviado."
        : `Funcionario cadastrado e acesso criado. Senha inicial: ${acesso?.default_password ?? "configurada no sistema"}`,
    );
  });
}

function fillForm(professor) {
  if (!professorForm || !professor) return;

  [
    "nome_completo",
    "email",
    "telefone",
    "cpf",
    "data_nascimento",
    "cargo",
    "perfil_acesso",
    "especialidade",
    "cref",
    "valor_hora",
    "horarios",
    "observacoes",
    "status",
  ].forEach((name) => {
    const field = professorForm.elements[name];
    if (field) field.value = professor[name] ?? "";
  });
}

async function setupEdit() {
  let professores = await fillSelect();
  let professorAtual = null;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    professorSelect.value = id;
    professorAtual = professores.find((professor) => professor.id === id);
    fillForm(professorAtual);
  }

  professorSelect?.addEventListener("change", () => {
    professorAtual = professores.find((professor) => professor.id === professorSelect.value);
    fillForm(professorAtual);
  });

  createAccessButton?.addEventListener("click", async () => {
    if (!professorSelect?.value || !professorAtual) {
      showMessage("Selecione um funcionario para criar o acesso.", "error");
      return;
    }

    createAccessButton.disabled = true;
    createAccessButton.textContent = "Criando acesso...";

    const professor = {
      ...professorAtual,
      ...formToProfessor(professorForm),
      id: professorSelect.value,
    };

    const { data: acesso, error: accessError } = await criarAcessoProfessor(professor);

    createAccessButton.disabled = false;
    createAccessButton.textContent = "Criar ou reenviar acesso";

    if (accessError) {
      showMessage(`Acesso nao foi criado: ${accessError}`, "error");
      return;
    }

    showMessage(
      acesso?.email_sent
        ? "Acesso criado e e-mail enviado ao funcionario."
        : `Acesso criado. Senha inicial: ${acesso?.default_password ?? "configurada no sistema"}`,
    );

    professores = await fillSelect();
    professorSelect.value = professor.id;
    professorAtual = professores.find((item) => item.id === professor.id);
  });

  professorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!professorSelect.value) {
      showMessage("Selecione um funcionario para editar.", "error");
      return;
    }

    const professor = formToProfessor(professorForm);
    const professorSalvo = professores.find((item) => item.id === professorSelect.value);

    const { error } = await supabase
      .from("professores")
      .update(professor)
      .eq("id", professorSelect.value);

    if (error) {
      showMessage("Nao foi possivel atualizar o funcionario. Tente novamente.", "error");
      return;
    }

    if (professorSalvo?.profile_id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nome: professor.nome_completo,
          nome_completo: professor.nome_completo,
          email: professor.email,
          tipo_usuario: professor.perfil_acesso,
          status: professor.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", professorSalvo.profile_id);

      if (profileError) {
        showMessage("Funcionario atualizado, mas nao foi possivel sincronizar o acesso. Tente novamente.", "error");
        return;
      }
    }

    const selectedId = professorSelect.value;
    showMessage("Funcionario atualizado com sucesso.");
    professores = await fillSelect();
    professorSelect.value = selectedId;
    professorAtual = professores.find((professor) => professor.id === selectedId);
    fillForm(professorAtual);
  });
}

async function setupDelete() {
  const professores = await getProfessores();
  let professorAtual = null;

  if (emptyState) {
    emptyState.classList.toggle("hidden", professores.length > 0);
  }

  setupProfessorSearch(professores, (professor) => {
    professorAtual = professor;

    if (professorSelected) {
      professorSelected.classList.remove("hidden");
      professorSelected.textContent = `${professor.nome_completo ?? "-"} | ${professorResumo(professor)}`;
    }

    if (deleteProfessorButton) deleteProfessorButton.disabled = false;
  });

  deleteProfessorButton?.addEventListener("click", async () => {
    if (!professorSelect?.value || !professorAtual) {
      showMessage("Selecione um funcionario para excluir.", "error");
      return;
    }

    const confirmed = window.confirm("Deseja excluir este funcionario? O acesso dele tambem sera desativado.");
    if (!confirmed) return;

    if (professorAtual.profile_id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          status: "INATIVO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", professorAtual.profile_id);

      if (profileError) {
        showMessage("Nao foi possivel desativar o acesso do funcionario. Tente novamente.", "error");
        return;
      }
    }

    const { error } = await supabase
      .from("professores")
      .delete()
      .eq("id", professorSelect.value);

    if (error) {
      showMessage("Nao foi possivel remover o funcionario. Tente novamente.", "error");
      return;
    }

    showMessage("Funcionario excluido e acesso desativado com sucesso.");
    if (professorSelect) professorSelect.value = "";
    if (professorSearch) professorSearch.value = "";
    if (professorResults) professorResults.classList.add("hidden");
    if (professorSelected) professorSelected.classList.add("hidden");
    if (deleteProfessorButton) deleteProfessorButton.disabled = true;
    professorAtual = null;
  });
}

const canAccessPage = await protectPage();

if (canAccessPage) {
  if (page === "cadastrar-professor") setupCreate();
  if (page === "editar-professor") setupEdit();
  if (page === "ver-professores") setupView();
  if (page === "excluir-professor") setupDelete();
}
