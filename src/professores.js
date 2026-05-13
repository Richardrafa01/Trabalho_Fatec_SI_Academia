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

  if (profile?.tipo_usuario !== "ADMIN" || profile?.status === "INATIVO") {
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
    showMessage(`Erro ao buscar professores: ${error.message}`, "error");
    return [];
  }

  return data ?? [];
}

function professorLabel(professor) {
  const status = professor.status ? ` - ${professor.status}` : "";
  return `${professor.nome_completo ?? "Professor sem nome"}${professor.email ? ` - ${professor.email}` : ""}${status}`;
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
    professor.email,
    professor.telefone,
    professor.especialidade ? `Especialidade: ${professor.especialidade}` : null,
    professor.status ? `Status: ${professor.status}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
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
    empty.textContent = "Nenhum professor encontrado com essas letras iniciais.";
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
    name.textContent = professor.nome_completo ?? "Professor sem nome";

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
  professorSelect.innerHTML = '<option value="">Selecione um professor</option>';

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
        Nenhum professor ativo encontrado.
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
          <dt class="font-bold text-slate-500">Especialidade</dt>
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

    card.querySelector("h2").textContent = professor.nome_completo ?? "Professor sem nome";
    card.querySelector("p").textContent = professor.email ?? "Sem e-mail";
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
    return "nao foi possivel chamar a Edge Function criar-acesso-professor. Publique a funcao no Supabase e confira os secrets SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.";
  }

  if (accessError?.context) {
    try {
      const payload = await accessError.context.json();
      if (payload?.error) return payload.error;
    } catch {
      try {
        const text = await accessError.context.text();
        if (text) return text;
      } catch {
        return accessError.message;
      }
    }
  }

  return accessError?.message ?? acesso?.error ?? "erro desconhecido.";
}

async function criarAcessoProfessor(professor) {
  const { data: acesso, error: accessError } = await supabase.functions.invoke("criar-acesso-professor", {
    body: {
      professor_id: professor.id,
      nome_completo: professor.nome_completo,
      email: professor.email,
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
      .select("id, nome_completo, email")
      .single();

    if (error) {
      showMessage(`Erro ao cadastrar professor: ${error.message}`, "error");
      return;
    }

    const { data: acesso, error: accessError } = await criarAcessoProfessor(novoProfessor);

    if (accessError) {
      showMessage(
        `Professor cadastrado, mas o acesso nao foi criado: ${accessError}`,
        "error",
      );
      return;
    }

    professorForm.reset();
    showMessage(
      acesso?.email_sent
        ? "Professor cadastrado, acesso criado e e-mail enviado."
        : `Professor cadastrado e acesso criado. Senha temporaria: ${acesso?.default_password ?? "Professor@123"}`,
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
      showMessage("Selecione um professor para criar o acesso.", "error");
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
        ? "Acesso criado e e-mail enviado ao professor."
        : `Acesso criado. Senha temporaria: ${acesso?.default_password ?? "Professor@123"}`,
    );

    professores = await fillSelect();
    professorSelect.value = professor.id;
    professorAtual = professores.find((item) => item.id === professor.id);
  });

  professorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!professorSelect.value) {
      showMessage("Selecione um professor para editar.", "error");
      return;
    }

    const professor = formToProfessor(professorForm);
    const professorSalvo = professores.find((item) => item.id === professorSelect.value);

    const { error } = await supabase
      .from("professores")
      .update(professor)
      .eq("id", professorSelect.value);

    if (error) {
      showMessage(`Erro ao editar professor: ${error.message}`, "error");
      return;
    }

    if (professorSalvo?.profile_id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nome: professor.nome_completo,
          nome_completo: professor.nome_completo,
          email: professor.email,
          status: professor.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", professorSalvo.profile_id);

      if (profileError) {
        showMessage(`Professor atualizado, mas o acesso nao foi sincronizado: ${profileError.message}`, "error");
        return;
      }
    }

    const selectedId = professorSelect.value;
    showMessage("Professor atualizado com sucesso.");
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
      showMessage("Selecione um professor para excluir.", "error");
      return;
    }

    const confirmed = window.confirm("Deseja excluir este professor? O acesso dele tambem sera desativado.");
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
        showMessage(`Erro ao desativar acesso do professor: ${profileError.message}`, "error");
        return;
      }
    }

    const { error } = await supabase
      .from("professores")
      .delete()
      .eq("id", professorSelect.value);

    if (error) {
      showMessage(`Erro ao excluir professor: ${error.message}`, "error");
      return;
    }

    showMessage("Professor excluido e acesso desativado com sucesso.");
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
