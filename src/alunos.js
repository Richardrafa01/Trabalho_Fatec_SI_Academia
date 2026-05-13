import { supabase } from "./supabase.js";

const page = document.body.dataset.page;
const message = document.querySelector("#message");
const alunosList = document.querySelector("#alunos-list");
const alunoSelect = document.querySelector("#aluno-id");
const alunoForm = document.querySelector("#aluno-form");
const emptyState = document.querySelector("#empty-state");
const historyBox = document.querySelector("#history-box");
const presencaBox = document.querySelector("#presenca-box");

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
  }
}

async function getAlunos() {
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(`Erro ao buscar alunos: ${error.message}`, "error");
    return [];
  }

  return data ?? [];
}

function alunoLabel(aluno) {
  return `${aluno.nome_completo ?? "Aluno sem nome"}${aluno.email ? ` - ${aluno.email}` : ""}`;
}

async function fillSelect() {
  if (!alunoSelect) return [];

  const alunos = await getAlunos();
  alunoSelect.innerHTML = '<option value="">Selecione um aluno</option>';

  alunos.forEach((aluno) => {
    const option = document.createElement("option");
    option.value = aluno.id;
    option.textContent = alunoLabel(aluno);
    alunoSelect.append(option);
  });

  if (emptyState) {
    emptyState.classList.toggle("hidden", alunos.length > 0);
  }

  return alunos;
}

function formToAluno(form) {
  const formData = new FormData(form);

  return {
    nome_completo: formData.get("nome_completo")?.trim(),
    email: formData.get("email")?.trim(),
    telefone: formData.get("telefone")?.trim(),
    cpf: formData.get("cpf")?.trim(),
    data_nascimento: formData.get("data_nascimento") || null,
    plano: formData.get("plano")?.trim() || null,
    validade_matricula: formData.get("validade_matricula") || null,
    observacoes: formData.get("observacoes")?.trim() || null,
    altura: formData.get("altura") ? Number(formData.get("altura")) : null,
    peso: formData.get("peso") ? Number(formData.get("peso")) : null,
    status: formData.get("status") || "ATIVO",
  };
}

function fillForm(aluno) {
  if (!alunoForm || !aluno) return;

  ["nome_completo", "email", "telefone", "cpf", "data_nascimento", "plano", "validade_matricula", "observacoes", "altura", "peso", "status"].forEach((name) => {
    const field = alunoForm.elements[name];
    if (field) field.value = aluno[name] ?? "";
  });
}

function renderAlunos(alunos, mode) {
  if (!alunosList) return;

  if (alunos.length === 0) {
    alunosList.innerHTML = `
      <tr>
        <td class="px-4 py-6 text-center text-slate-500" colspan="5">
          Nenhum aluno cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  alunosList.innerHTML = alunos
    .map((aluno) => {
      const action =
        mode === "delete"
          ? `<button class="delete-aluno font-bold text-red-600" data-id="${aluno.id}">Excluir</button>`
          : `<a class="font-bold text-orange-700" href="/admin/editar-aluno.html?id=${aluno.id}">Editar</a>`;

      return `
        <tr>
          <td class="px-4 py-3 font-semibold">${aluno.nome_completo ?? "-"}</td>
          <td class="px-4 py-3">${aluno.email ?? "-"}</td>
          <td class="px-4 py-3">${aluno.telefone ?? "-"}</td>
          <td class="px-4 py-3">${aluno.status ?? "-"}</td>
          <td class="px-4 py-3">${action}</td>
        </tr>
      `;
    })
    .join("");
}

async function setupCreate() {
  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const aluno = formToAluno(alunoForm);
    const { error } = await supabase.from("alunos").insert(aluno);

    if (error) {
      showMessage(`Erro ao cadastrar aluno: ${error.message}`, "error");
      return;
    }

    alunoForm.reset();
    showMessage("Aluno cadastrado com sucesso.");
  });
}

async function setupEdit() {
  const alunos = await fillSelect();
  renderAlunos(alunos, "edit");

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    alunoSelect.value = id;
    fillForm(alunos.find((aluno) => aluno.id === id));
  }

  alunoSelect?.addEventListener("change", () => {
    fillForm(alunos.find((aluno) => aluno.id === alunoSelect.value));
  });

  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!alunoSelect.value) {
      showMessage("Selecione um aluno para editar.", "error");
      return;
    }

    const { error } = await supabase
      .from("alunos")
      .update(formToAluno(alunoForm))
      .eq("id", alunoSelect.value);

    if (error) {
      showMessage(`Erro ao editar aluno: ${error.message}`, "error");
      return;
    }

    showMessage("Aluno atualizado com sucesso.");
  });
}

async function setupDelete() {
  const alunos = await getAlunos();
  renderAlunos(alunos, "delete");

  alunosList?.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-aluno");
    if (!button) return;

    const confirmed = window.confirm("Deseja excluir este aluno?");
    if (!confirmed) return;

    const { error } = await supabase.from("alunos").delete().eq("id", button.dataset.id);

    if (error) {
      showMessage(`Erro ao excluir aluno: ${error.message}`, "error");
      return;
    }

    showMessage("Aluno excluido com sucesso.");
    renderAlunos(await getAlunos(), "delete");
  });
}

async function setupHistorico() {
  const alunos = await fillSelect();

  alunoSelect?.addEventListener("change", () => {
    const aluno = alunos.find((item) => item.id === alunoSelect.value);
    if (!aluno || !historyBox) return;

    const cadastradoEm = aluno.created_at
      ? new Date(aluno.created_at).toLocaleString("pt-BR")
      : "Data nao informada";

    historyBox.textContent = [
      `Nome: ${aluno.nome_completo ?? "-"}`,
      `E-mail: ${aluno.email ?? "-"}`,
      `CPF: ${aluno.cpf ?? "-"}`,
      `Status: ${aluno.status ?? "-"}`,
      `Plano: ${aluno.plano ?? "-"}`,
      `Validade da matricula: ${aluno.validade_matricula ?? "-"}`,
      `Altura: ${aluno.altura ?? "-"} m`,
      `Peso: ${aluno.peso ?? "-"} kg`,
      `Cadastrado em: ${cadastradoEm}`,
      `Observacoes: ${aluno.observacoes ?? "-"}`,
    ].join("\n");
  });
}

async function setupRenew() {
  await fillSelect();

  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!alunoSelect.value) {
      showMessage("Selecione um aluno para renovar a matricula.", "error");
      return;
    }

    const validade = alunoForm.elements.validade_matricula.value;

    const { error } = await supabase
      .from("alunos")
      .update({
        status: "ATIVO",
        validade_matricula: validade,
      })
      .eq("id", alunoSelect.value);

    if (error) {
      showMessage(`Erro ao renovar matricula: ${error.message}`, "error");
      return;
    }

    showMessage("Matricula renovada com sucesso.");
  });
}

async function setupPlano() {
  await fillSelect();

  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!alunoSelect.value) {
      showMessage("Selecione um aluno para vincular o plano.", "error");
      return;
    }

    const plano = alunoForm.elements.plano.value.trim();
    const { error } = await supabase.from("alunos").update({ plano }).eq("id", alunoSelect.value);

    if (error) {
      showMessage(`Erro ao vincular plano: ${error.message}`, "error");
      return;
    }

    showMessage("Plano vinculado com sucesso.");
  });
}

async function setupPresenca() {
  const alunos = await fillSelect();

  alunoSelect?.addEventListener("change", () => {
    const aluno = alunos.find((item) => item.id === alunoSelect.value);
    if (!aluno || !presencaBox) return;

    presencaBox.textContent =
      "A tabela alunos atual nao possui uma coluna para presencas. Quando criarmos a tabela de presencas, os registros aparecerao aqui.";
  });

  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!alunoSelect.value) {
      showMessage("Selecione um aluno para registrar presenca.", "error");
      return;
    }

    showMessage("A presenca sera salva quando criarmos a tabela de presencas.", "error");
  });
}

await protectPage();

if (page === "cadastrar-aluno") setupCreate();
if (page === "editar-aluno") setupEdit();
if (page === "excluir-aluno") setupDelete();
if (page === "historico-aluno") setupHistorico();
if (page === "renovar-matricula") setupRenew();
if (page === "vincular-plano") setupPlano();
if (page === "presenca-aluno") setupPresenca();
