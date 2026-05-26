import { supabase } from "./supabase.js";
import { getPlanos, planoOptionLabel, planosToMap } from "./planos.js";
import { appPath, navigate } from "./routes.js";

const page = document.body.dataset.page;
const area = document.body.dataset.area ?? "admin";
const message = document.querySelector("#message");
const alunoSelect = document.querySelector("#aluno-id");
const alunoSearch = document.querySelector("#aluno-search");
const alunoResults = document.querySelector("#aluno-results");
let alunoQuickListButton = null;
const alunoSelected = document.querySelector("#aluno-selected");
const deleteAlunoButton = document.querySelector("#delete-aluno-button");
const bloquearAlunoButton = document.querySelector("#bloquear-aluno-button");
const liberarAlunoButton = document.querySelector("#liberar-aluno-button");
const alunosCards = document.querySelector("#alunos-cards");
const alunoForm = document.querySelector("#aluno-form");
const emptyState = document.querySelector("#empty-state");
const historyBox = document.querySelector("#history-box");
const presencaBox = document.querySelector("#presenca-box");
const validadePreview = document.querySelector("#validade-preview");

let planos = {};
const backofficeRoles = ["ADMIN", "GERENTE", "ADMINISTRATIVO", "RECEPCAO"];

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
    navigate("/");
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tipo_usuario, status")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (profile?.status === "INATIVO") {
    await supabase.auth.signOut();
    navigate("/");
    return false;
  }

  const paginasPermitidasProfessor = ["ver-alunos", "historico-aluno", "presenca-aluno"];

  if (profile?.tipo_usuario === "PROFESSOR" && area !== "professor") {
    const redirectByPage = {
      "ver-alunos": "/professor/ver-alunos.html",
      "historico-aluno": `/professor/historico-aluno.html${window.location.search}`,
      "presenca-aluno": `/professor/presenca-aluno.html${window.location.search}`,
    };

    navigate(redirectByPage[page] ?? "/professor/menu.html");
    return false;
  }

  if (profile?.tipo_usuario === "PROFESSOR" && !paginasPermitidasProfessor.includes(page)) {
    navigate("/professor/menu.html");
    return false;
  }

  if (![...backofficeRoles, "PROFESSOR"].includes(profile?.tipo_usuario)) {
    await supabase.auth.signOut();
    navigate("/");
    return false;
  }

  return true;
}

async function desativarMatriculasVencidas() {
  const today = toInputDate(todayAsDate());

  await supabase
    .from("alunos")
    .update({ status: "INATIVO" })
    .eq("status", "ATIVO")
    .lt("validade_matricula", today);
}

async function getAlunos() {
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showMessage("Nao foi possivel carregar os alunos. Tente novamente.", "error");
    return [];
  }

  return data ?? [];
}

function alunoLabel(aluno) {
  return `${aluno.nome_completo ?? "Aluno sem nome"}${aluno.email ? ` - ${aluno.email}` : ""}`;
}

function normalizeText(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function formatDateBR(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function calcularValidadeMatricula(plano) {
  const config = planos[plano];
  if (!config) return null;

  const validade = todayAsDate();
  validade.setMonth(validade.getMonth() + config.meses);
  return toInputDate(validade);
}

function formatCurrencyBR(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function loadPlanosAcademia() {
  const planosList = await getPlanos(supabase, { ativosOnly: true });
  planos = planosToMap(planosList);
  fillPlanoOptions(planosList);
}

function fillPlanoOptions(planosList) {
  const planoField = alunoForm?.elements.plano;
  if (!planoField || planoField.tagName !== "SELECT") return;

  const currentValue = planoField.value;
  planoField.innerHTML = '<option value="">Selecione um plano</option>';

  planosList.forEach((plano) => {
    const option = document.createElement("option");
    option.value = plano.nome;
    option.textContent = planoOptionLabel(plano);
    planoField.append(option);
  });

  if (planosList.some((plano) => plano.nome === currentValue)) {
    planoField.value = currentValue;
  }
}

async function registrarPagamentoMatricula({
  alunoId,
  plano,
  formaPagamento,
  validadeAnterior = null,
  validadeNova,
  observacoes = null,
}) {
  const config = planos[plano];
  if (!config) {
    return { error: { message: "Plano invalido para registrar pagamento." } };
  }

  return supabase.from("pagamentos_matriculas").insert({
    aluno_id: alunoId,
    plano,
    valor: config.valor,
    forma_pagamento: formaPagamento,
    status: "PAGO",
    validade_anterior: validadeAnterior,
    validade_nova: validadeNova,
    observacoes,
  });
}

function alunoTemAcesso(aluno) {
  const today = toInputDate(todayAsDate());
  return aluno?.status === "ATIVO" && (!aluno.validade_matricula || aluno.validade_matricula >= today);
}

async function getAcessosAluno(alunoId) {
  const { data, error } = await supabase
    .from("acessos_catraca")
    .select("status, motivo, origem, registrado_em")
    .eq("aluno_id", alunoId)
    .order("registrado_em", { ascending: false })
    .limit(10);

  if (error) {
    showMessage("Nao foi possivel carregar os acessos do aluno. Tente novamente.", "error");
    return [];
  }

  return data ?? [];
}

function renderAcessos(aluno, acessos) {
  if (!presencaBox) return;

  const situacao = alunoTemAcesso(aluno)
    ? "Situacao atual: acesso possivelmente liberado."
    : "Situacao atual: acesso bloqueado por status inativo ou vencimento.";

  const linhas = acessos.length
    ? acessos.map((acesso) => {
        const dataAcesso = acesso.registrado_em
          ? new Date(acesso.registrado_em).toLocaleString("pt-BR")
          : "Data nao informada";

        return `${dataAcesso} | ${acesso.status} | ${acesso.origem} | ${acesso.motivo ?? "-"}`;
      })
    : ["Nenhum acesso registrado ainda."];

  presencaBox.textContent = [
    `Aluno: ${aluno.nome_completo ?? "-"}`,
    `Status: ${aluno.status ?? "-"}`,
    `Plano: ${aluno.plano ?? "-"}`,
    `Vencimento: ${aluno.validade_matricula ? formatDateBR(aluno.validade_matricula) : "-"}`,
    situacao,
    "",
    "Ultimos acessos:",
    ...linhas,
  ].join("\n");
}

async function registrarAcessoCatraca(alunoId, origem = "ADMIN") {
  const { data, error } = await supabase.rpc("registrar_acesso_catraca", {
    p_aluno_id: alunoId,
    p_origem: origem,
  });

  if (error) {
    showMessage("Nao foi possivel validar o acesso. Tente novamente.", "error");
    return null;
  }

  return Array.isArray(data) ? data[0] : data;
}

function atualizarValidadePreview() {
  if (!alunoForm || !validadePreview) return;

  const plano = alunoForm.elements.plano?.value;
  const validade = calcularValidadeMatricula(plano);

  validadePreview.textContent = validade
    ? `Vencimento automatico: ${formatDateBR(validade)}`
    : "Selecione um plano para calcular automaticamente.";
}

function atualizarRenovacaoPreview() {
  if (!alunoForm || !validadePreview) return;

  const plano = alunoForm.elements.plano?.value;
  const config = planos[plano];
  const validade = calcularValidadeMatricula(plano);

  validadePreview.textContent = config && validade
    ? `Valor: ${formatCurrencyBR(config.valor)} | Nova validade: ${formatDateBR(validade)}`
    : "Selecione um plano para calcular valor e validade.";
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function fillAddress(address) {
  if (!alunoForm) return;

  const fields = {
    endereco: address.logradouro,
    bairro: address.bairro,
    cidade: address.localidade,
    estado: address.uf,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const field = alunoForm.elements[name];
    if (field) field.value = value ?? "";
  });

  alunoForm.elements.numero?.focus();
}

async function buscarEnderecoPorCep(cep) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const address = await response.json();

    if (address.erro) {
      showMessage("CEP nao encontrado.", "error");
      return;
    }

    fillAddress(address);
  } catch {
    showMessage("Nao foi possivel buscar o endereco pelo CEP.", "error");
  }
}

function setupCepLookup() {
  const cepField = alunoForm?.elements.cep;
  if (!cepField) return;

  cepField.addEventListener("input", () => {
    cepField.value = formatCep(cepField.value);
  });

  cepField.addEventListener("blur", () => {
    buscarEnderecoPorCep(cepField.value);
  });
}

async function fillSelect() {
  if (!alunoSelect) return [];

  const alunos = await getAlunos();

  if (alunoSelect.tagName === "SELECT") {
    alunoSelect.innerHTML = '<option value="">Selecione um aluno</option>';

    alunos.forEach((aluno) => {
      const option = document.createElement("option");
      option.value = aluno.id;
      option.textContent = alunoLabel(aluno);
      alunoSelect.append(option);
    });
  } else {
    alunoSelect.value = "";
  }

  if (emptyState) {
    emptyState.classList.toggle("hidden", alunos.length > 0);
  }

  return alunos;
}

function alunoResumo(aluno) {
  return [
    aluno.email,
    aluno.telefone,
    aluno.plano ? `Plano: ${aluno.plano}` : null,
    aluno.status ? `Status: ${aluno.status}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function sortAlunosPorNome(alunos) {
  return [...alunos].sort((first, second) =>
    (first.nome_completo ?? "").localeCompare(second.nome_completo ?? "", "pt-BR", {
      sensitivity: "base",
    }),
  );
}

function primeirosAlunosPorNome(alunos, limit = 10) {
  return sortAlunosPorNome(alunos).slice(0, limit);
}

function buscarAlunosPorInicio(alunos, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return [];

  return sortAlunosPorNome(alunos).filter((aluno) =>
    normalizeText(aluno.nome_completo).startsWith(normalizedTerm),
  );
}

function setupAlunoQuickListButton() {
  if (area !== "admin") return null;
  if (!alunoSearch || alunoQuickListButton) return alunoQuickListButton;

  const wrapper = document.createElement("div");
  wrapper.className = "flex gap-2";

  alunoSearch.parentNode.insertBefore(wrapper, alunoSearch);
  wrapper.append(alunoSearch);

  alunoSearch.classList.add("min-w-0", "flex-1");

  alunoQuickListButton = document.createElement("button");
  alunoQuickListButton.id = "aluno-quick-list-button";
  alunoQuickListButton.className = "h-12 w-12 shrink-0 rounded-md border border-slate-300 bg-white text-lg font-bold text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700";
  alunoQuickListButton.type = "button";
  alunoQuickListButton.title = "Mostrar 10 primeiros alunos";
  alunoQuickListButton.setAttribute("aria-label", "Mostrar 10 primeiros alunos");
  alunoQuickListButton.textContent = "...";
  wrapper.append(alunoQuickListButton);

  return alunoQuickListButton;
}

function selectAluno(aluno, onSelect) {
  if (alunoSelect) alunoSelect.value = aluno.id;
  if (alunoSearch) alunoSearch.value = alunoLabel(aluno);
  if (alunoResults) alunoResults.classList.add("hidden");
  onSelect(aluno);
}

function renderAlunoResults(alunos, onSelect, options = {}) {
  if (!alunoResults) return;

  alunoResults.innerHTML = "";

  if (!options.forceVisible && !alunoSearch.value.trim()) {
    alunoResults.classList.add("hidden");
    return;
  }

  if (alunos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "px-4 py-3 text-sm text-slate-500";
    empty.textContent = "Nenhum aluno encontrado.";
    alunoResults.append(empty);
    alunoResults.classList.remove("hidden");
    return;
  }

  alunos.forEach((aluno) => {
    const button = document.createElement("button");
    button.className = "block w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-orange-50";
    button.type = "button";

    const name = document.createElement("strong");
    name.className = "block text-slate-950";
    name.textContent = aluno.nome_completo ?? "Aluno sem nome";

    const meta = document.createElement("span");
    meta.className = "mt-1 block text-xs text-slate-500";
    meta.textContent = alunoResumo(aluno);

    button.append(name, meta);
    button.addEventListener("click", () => selectAluno(aluno, onSelect));

    alunoResults.append(button);
  });

  alunoResults.classList.remove("hidden");
}

function setupAlunoSearch(alunos, onSelect) {
  if (!alunoSearch) return;

  setupAlunoQuickListButton()?.addEventListener("click", () => {
    if (alunoSelect) alunoSelect.value = "";
    alunoSearch.value = "";
    renderAlunoResults(primeirosAlunosPorNome(alunos), onSelect, { forceVisible: true });
  });

  alunoSearch.addEventListener("input", () => {
    if (alunoSelect) alunoSelect.value = "";
    renderAlunoResults(buscarAlunosPorInicio(alunos, alunoSearch.value), onSelect);
  });
}

function selecionarAlunoInicial(alunos, id, onSelect) {
  if (!id) return;

  const aluno = alunos.find((item) => item.id === id);
  if (!aluno) return;

  if (alunoSelect) alunoSelect.value = aluno.id;
  if (alunoSearch) alunoSearch.value = alunoLabel(aluno);
  onSelect(aluno);
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
    validade_matricula:
      formData.get("validade_matricula") || calcularValidadeMatricula(formData.get("plano")) || null,
    cep: formData.get("cep")?.trim() || null,
    endereco: formData.get("endereco")?.trim() || null,
    numero: formData.get("numero")?.trim() || null,
    bairro: formData.get("bairro")?.trim() || null,
    cidade: formData.get("cidade")?.trim() || null,
    estado: formData.get("estado")?.trim().toUpperCase() || null,
    complemento: formData.get("complemento")?.trim() || null,
    observacoes: formData.get("observacoes")?.trim() || null,
    status: formData.get("status") || "ATIVO",
  };
}

function fillForm(aluno) {
  if (!alunoForm || !aluno) return;

  ["nome_completo", "email", "telefone", "cpf", "data_nascimento", "plano", "validade_matricula", "cep", "endereco", "numero", "bairro", "cidade", "estado", "complemento", "observacoes", "status"].forEach((name) => {
    const field = alunoForm.elements[name];
    if (field) field.value = aluno[name] ?? "";
  });
}

async function setupCreate() {
  atualizarValidadePreview();
  setupCepLookup();
  alunoForm?.elements.plano?.addEventListener("change", atualizarValidadePreview);

  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const aluno = formToAluno(alunoForm);
    const formaPagamento = alunoForm.elements.forma_pagamento?.value;
    const pagamentoConfirmado = alunoForm.elements.pagamento_confirmado?.checked;

    if (!formaPagamento) {
      showMessage("Selecione a forma de pagamento.", "error");
      return;
    }

    if (!pagamentoConfirmado) {
      showMessage("Confirme o pagamento inicial.", "error");
      return;
    }

    const { data: novoAluno, error } = await supabase
      .from("alunos")
      .insert(aluno)
      .select("id, validade_matricula")
      .single();

    if (error) {
      showMessage("Nao foi possivel cadastrar o aluno. Confira os dados e tente novamente.", "error");
      return;
    }

    const { error: paymentError } = await registrarPagamentoMatricula({
      alunoId: novoAluno.id,
      plano: aluno.plano,
      formaPagamento,
      validadeNova: novoAluno.validade_matricula,
      observacoes: "Pagamento inicial no cadastro do aluno.",
    });

    if (paymentError) {
      showMessage("Aluno cadastrado, mas nao foi possivel registrar o pagamento. Tente novamente.", "error");
      return;
    }

    alunoForm.reset();
    atualizarValidadePreview();
    showMessage("Aluno cadastrado e pagamento inicial registrado com sucesso.");
  });
}

async function setupEdit() {
  setupCepLookup();
  const alunos = await fillSelect();
  setupAlunoSearch(alunos, fillForm);

  const params = new URLSearchParams(window.location.search);
  selecionarAlunoInicial(alunos, params.get("id"), fillForm);

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
      showMessage("Nao foi possivel atualizar o aluno. Tente novamente.", "error");
      return;
    }

    showMessage("Aluno atualizado com sucesso.");
  });
}

async function setupDelete() {
  const alunos = await getAlunos();

  if (emptyState) {
    emptyState.classList.toggle("hidden", alunos.length > 0);
  }

  setupAlunoSearch(alunos, (aluno) => {
    if (alunoSelected) {
      alunoSelected.classList.remove("hidden");
      alunoSelected.textContent = `${aluno.nome_completo ?? "-"} | ${alunoResumo(aluno)}`;
    }

    if (deleteAlunoButton) deleteAlunoButton.disabled = false;
  });

  deleteAlunoButton?.addEventListener("click", async () => {
    if (!alunoSelect?.value) {
      showMessage("Selecione um aluno para excluir.", "error");
      return;
    }

    const confirmed = window.confirm("Deseja excluir este aluno?");
    if (!confirmed) return;

    const { error } = await supabase.from("alunos").delete().eq("id", alunoSelect.value);

    if (error) {
      showMessage("Nao foi possivel remover o cadastro do aluno. Tente novamente.", "error");
      return;
    }

    showMessage("Aluno excluido com sucesso.");
    if (alunoSelect) alunoSelect.value = "";
    if (alunoSearch) alunoSearch.value = "";
    if (alunoResults) alunoResults.classList.add("hidden");
    if (alunoSelected) alunoSelected.classList.add("hidden");
    if (deleteAlunoButton) deleteAlunoButton.disabled = true;
  });
}

async function setupHistorico() {
  const alunos = await fillSelect();

  const renderHistorico = (aluno) => {
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
      `CEP: ${aluno.cep ?? "-"}`,
      `Endereco: ${aluno.endereco ?? "-"}`,
      `Numero: ${aluno.numero ?? "-"}`,
      `Bairro: ${aluno.bairro ?? "-"}`,
      `Cidade: ${aluno.cidade ?? "-"}`,
      `Estado: ${aluno.estado ?? "-"}`,
      `Complemento: ${aluno.complemento ?? "-"}`,
      `Cadastrado em: ${cadastradoEm}`,
      `Observacoes: ${aluno.observacoes ?? "-"}`,
    ].join("\n");
  };

  setupAlunoSearch(alunos, renderHistorico);

  const params = new URLSearchParams(window.location.search);
  selecionarAlunoInicial(alunos, params.get("id"), renderHistorico);
}

async function setupRenew() {
  const alunos = await fillSelect();
  let alunoAtual = null;

  atualizarRenovacaoPreview();
  alunoForm?.elements.plano?.addEventListener("change", atualizarRenovacaoPreview);

  setupAlunoSearch(alunos, (aluno) => {
    alunoAtual = aluno;

    if (alunoSelected) {
      alunoSelected.classList.remove("hidden");
      alunoSelected.textContent = [
        `Aluno: ${aluno.nome_completo ?? "-"}`,
        `Status atual: ${aluno.status ?? "-"}`,
        `Vencimento atual: ${aluno.validade_matricula ? formatDateBR(aluno.validade_matricula) : "-"}`,
      ].join(" | ");
    }
  });

  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!alunoSelect.value || !alunoAtual) {
      showMessage("Selecione um aluno para renovar a matricula.", "error");
      return;
    }

    const plano = alunoForm.elements.plano.value;
    const config = planos[plano];
    const validade = calcularValidadeMatricula(plano);
    const formaPagamento = alunoForm.elements.forma_pagamento.value;
    const pagamentoConfirmado = alunoForm.elements.pagamento_confirmado.checked;

    if (!config || !validade) {
      showMessage("Selecione um plano para renovar a matricula.", "error");
      return;
    }

    if (!formaPagamento) {
      showMessage("Selecione a forma de pagamento.", "error");
      return;
    }

    if (!pagamentoConfirmado) {
      showMessage("Confirme o pagamento.", "error");
      return;
    }

    const { error: paymentError } = await registrarPagamentoMatricula({
      alunoId: alunoSelect.value,
      plano,
      formaPagamento,
      validadeAnterior: alunoAtual.validade_matricula || null,
      validadeNova: validade,
      observacoes: alunoForm.elements.observacoes_pagamento.value.trim() || null,
    });

    if (paymentError) {
      showMessage("Nao foi possivel registrar o pagamento. Tente novamente.", "error");
      return;
    }

    const { error } = await supabase
      .from("alunos")
      .update({
        status: "ATIVO",
        plano,
        validade_matricula: validade,
      })
      .eq("id", alunoSelect.value);

    if (error) {
      showMessage("Nao foi possivel renovar a matricula. Tente novamente.", "error");
      return;
    }

    showMessage("Pagamento registrado e matricula reativada com sucesso.");
    alunoAtual = {
      ...alunoAtual,
      plano,
      status: "ATIVO",
      validade_matricula: validade,
    };
    if (alunoSelected) {
      alunoSelected.textContent = [
        `Aluno: ${alunoAtual.nome_completo ?? "-"}`,
        "Status atual: ATIVO",
        `Vencimento atual: ${formatDateBR(validade)}`,
      ].join(" | ");
    }
  });
}

async function setupPresenca() {
  const alunos = await fillSelect();
  let alunoAtual = null;

  setupAlunoSearch(alunos, async (aluno) => {
    alunoAtual = aluno;
    if (!aluno) return;

    renderAcessos(aluno, await getAcessosAluno(aluno.id));
  });

  alunoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!alunoSelect.value) {
      showMessage("Selecione um aluno para registrar presenca.", "error");
      return;
    }

    const resultado = await registrarAcessoCatraca(alunoSelect.value, "ADMIN");
    if (!resultado) return;

    if (resultado.liberado) {
      showMessage("Entrada liberada.");
    } else {
      showMessage(`Entrada bloqueada: ${resultado.motivo}`, "error");
    }

    const alunoAtualizado = {
      ...alunoAtual,
      status: resultado.liberado ? "ATIVO" : alunoAtual?.status,
    };

    if (!alunoAtualizado) {
      return;
    }

    renderAcessos(alunoAtualizado, await getAcessosAluno(alunoSelect.value));
  });
}

async function getBloqueioAtivo(alunoId) {
  const { data, error } = await supabase
    .from("bloqueios_alunos")
    .select("id, motivo, bloqueado_em")
    .eq("aluno_id", alunoId)
    .eq("ativo", true)
    .order("bloqueado_em", { ascending: false })
    .limit(1);

  if (error) {
    showMessage("Nao foi possivel consultar os bloqueios do aluno. Tente novamente.", "error");
    return null;
  }

  return data?.[0] ?? null;
}

async function renderBloqueioAluno(aluno) {
  const bloqueio = await getBloqueioAtivo(aluno.id);

  if (alunoSelected) {
    alunoSelected.classList.remove("hidden");
    alunoSelected.textContent = [
      `Aluno: ${aluno.nome_completo ?? "-"}`,
      `Status: ${aluno.status ?? "-"}`,
      bloqueio ? `Bloqueio ativo: ${bloqueio.motivo}` : "Sem bloqueio manual ativo",
    ].join(" | ");
  }

  if (bloquearAlunoButton) bloquearAlunoButton.disabled = false;
  if (liberarAlunoButton) liberarAlunoButton.disabled = !bloqueio;
}

async function setupBlock() {
  const alunos = await fillSelect();
  let alunoAtual = null;

  setupAlunoSearch(alunos, async (aluno) => {
    alunoAtual = aluno;
    await renderBloqueioAluno(aluno);
  });

  bloquearAlunoButton?.addEventListener("click", async () => {
    if (!alunoSelect.value || !alunoAtual) {
      showMessage("Selecione um aluno para bloquear.", "error");
      return;
    }

    const motivo = alunoForm.elements.motivo_bloqueio.value.trim();
    if (!motivo) {
      showMessage("Informe o motivo do bloqueio.", "error");
      return;
    }

    const { error } = await supabase.from("bloqueios_alunos").insert({
      aluno_id: alunoSelect.value,
      motivo,
      ativo: true,
    });

    if (error) {
      showMessage("Nao foi possivel bloquear o aluno. Tente novamente.", "error");
      return;
    }

    showMessage("Aluno bloqueado.");
    alunoForm.elements.motivo_bloqueio.value = "";
    await renderBloqueioAluno(alunoAtual);
  });

  liberarAlunoButton?.addEventListener("click", async () => {
    if (!alunoSelect.value || !alunoAtual) {
      showMessage("Selecione um aluno para liberar.", "error");
      return;
    }

    const { error } = await supabase
      .from("bloqueios_alunos")
      .update({ ativo: false })
      .eq("aluno_id", alunoSelect.value)
      .eq("ativo", true);

    if (error) {
      showMessage("Nao foi possivel liberar o aluno. Tente novamente.", "error");
      return;
    }

    showMessage("Acesso liberado.");
    await renderBloqueioAluno(alunoAtual);
  });
}

function renderAlunoCards(alunos) {
  if (!alunosCards) return;

  alunosCards.innerHTML = "";

  if (alunos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 sm:col-span-2";
    empty.textContent = alunoSearch?.value.trim()
      ? "Nenhum aluno encontrado."
      : "Use a busca para localizar alunos.";
    alunosCards.append(empty);
    return;
  }

  const historicoHref = (alunoId) =>
    area === "professor"
      ? appPath(`/professor/historico-aluno.html?id=${alunoId}`)
      : appPath(`/admin/historico-aluno.html?id=${alunoId}`);

  const editarHref = (alunoId) => appPath(`/admin/editar-aluno.html?id=${alunoId}`);

  alunos.forEach((aluno) => {
    const card = document.createElement("article");
    card.className = "rounded-md border border-slate-200 p-4";

    const name = document.createElement("h2");
    name.className = "text-base font-bold text-slate-950";
    name.textContent = aluno.nome_completo ?? "Aluno sem nome";

    const meta = document.createElement("p");
    meta.className = "mt-2 text-sm text-slate-600";
    meta.textContent = alunoResumo(aluno) || "Sem dados complementares.";

    const actions = document.createElement("div");
    actions.className = "mt-4 flex flex-wrap gap-2";
    actions.innerHTML = area === "professor"
      ? `
        <a class="rounded-md bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700" href="${historicoHref(aluno.id)}">Historico</a>
      `
      : `
        <a class="rounded-md bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700" href="${editarHref(aluno.id)}">Editar</a>
        <a class="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" href="${historicoHref(aluno.id)}">Historico</a>
      `;

    card.append(name, meta, actions);
    alunosCards.append(card);
  });
}

async function setupView() {
  const alunos = await getAlunos();

  if (emptyState) {
    emptyState.classList.toggle("hidden", alunos.length > 0);
  }

  setupAlunoQuickListButton()?.addEventListener("click", () => {
    alunoSearch.value = "";
    renderAlunoCards(primeirosAlunosPorNome(alunos));
  });

  renderAlunoCards([]);

  alunoSearch?.addEventListener("input", () => {
    renderAlunoCards(buscarAlunosPorInicio(alunos, alunoSearch.value));
  });
}

const canAccessPage = await protectPage();

if (canAccessPage) {
  await desativarMatriculasVencidas();
  await loadPlanosAcademia();

  if (page === "cadastrar-aluno") setupCreate();
  if (page === "ver-alunos") setupView();
  if (page === "editar-aluno") setupEdit();
  if (page === "excluir-aluno") setupDelete();
  if (page === "historico-aluno") setupHistorico();
  if (page === "renovar-matricula") setupRenew();
  if (page === "presenca-aluno") setupPresenca();
  if (page === "bloquear-aluno") setupBlock();
}
