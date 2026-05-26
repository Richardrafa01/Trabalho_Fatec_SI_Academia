import { supabase } from "./supabase.js";
import { calcularValorPlano, excluirPlano, formatCurrencyBR, getPlanoMensal, getPlanos, normalizeDesconto, salvarPlano } from "./planos.js";
import { navigate } from "./routes.js";

const planosLista = document.querySelector("#planos-lista");
const planosMessage = document.querySelector("#planos-message");
const novoPlanoButton = document.querySelector("#novo-plano-button");
const novoPlanoForm = document.querySelector("#novo-plano-form");
const backofficeRoles = ["ADMIN", "GERENTE", "ADMINISTRATIVO", "RECEPCAO"];
let planosAtuais = [];

function showPlanosMessage(text, type = "success") {
  if (!planosMessage) return;
  planosMessage.textContent = text;
  planosMessage.className =
    type === "success"
      ? "mt-5 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
      : "mt-5 rounded-md bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700";
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

  if (!backofficeRoles.includes(profile?.tipo_usuario) || profile?.status === "INATIVO") {
    await supabase.auth.signOut();
    navigate("/");
    return false;
  }

  return true;
}

function validatePlano(plano) {
  if (!plano.nome?.trim()) return "Informe o nome do plano.";
  if (!Number.isFinite(plano.valor) || plano.valor < 0) return "Informe um valor maior ou igual a zero.";
  if (!Number.isFinite(plano.meses) || plano.meses < 1) return "Informe uma duração de pelo menos 1 mês.";
  return null;
}

function setFieldState(control, isEditing) {
  [control.valorInput, control.mesesInput, control.descontoInput, control.statusSelect].forEach((field) => {
    field.disabled = !isEditing;
    field.classList.toggle("bg-slate-100", !isEditing);
    field.classList.toggle("text-slate-600", !isEditing);
  });

  control.editButton.classList.toggle("hidden", isEditing);
  control.saveButton.classList.toggle("hidden", !isEditing);
}

function readPlanoControl(control) {
  return {
    nome: control.plano.nome,
    meses: Number(control.mesesInput.value),
    valor: Number(control.valorInput.value),
    desconto: normalizeDesconto(control.descontoInput.value),
    status: control.statusSelect.value,
    ordem: control.plano.ordem,
  };
}

function shouldCalculateValue(plano) {
  return plano.nome?.toLowerCase() !== "mensal" && Number(plano.ordem) !== 1;
}

function calculateDraftValue(planoDraft) {
  if (!shouldCalculateValue(planoDraft)) return Number(planoDraft.valor);
  return calcularValorPlano(planoDraft, getPlanoMensal(planosAtuais));
}

function createActionButton(text, className) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = text;
  return button;
}

async function carregarPlanos() {
  if (!planosLista) return;

  planosAtuais = await getPlanos(supabase);
  planosLista.innerHTML = "";

  planosAtuais.forEach((plano) => {
    const row = document.createElement("tr");

    const nomeCell = document.createElement("td");
    nomeCell.className = "px-4 py-3 font-semibold";
    nomeCell.textContent = plano.nome;

    const valorCell = document.createElement("td");
    valorCell.className = "px-4 py-3";
    const valorInput = document.createElement("input");
    valorInput.className = "h-10 w-28 rounded-md border border-slate-300 px-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";
    valorInput.type = "number";
    valorInput.min = "0";
    valorInput.step = "0.01";
    valorInput.value = Number(plano.valor ?? 0).toFixed(2);
    valorCell.append(valorInput);

    const mesesCell = document.createElement("td");
    mesesCell.className = "px-4 py-3";
    const mesesInput = document.createElement("input");
    mesesInput.className = "h-10 w-24 rounded-md border border-slate-300 px-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";
    mesesInput.type = "number";
    mesesInput.min = "1";
    mesesInput.step = "1";
    mesesInput.value = plano.meses;
    mesesCell.append(mesesInput);

    const descontoCell = document.createElement("td");
    descontoCell.className = "px-4 py-3";
    const descontoInput = document.createElement("input");
    descontoInput.className = "h-10 w-32 rounded-md border border-slate-300 px-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";
    descontoInput.value = plano.desconto ?? "Sem desconto";
    descontoCell.append(descontoInput);

    const statusCell = document.createElement("td");
    statusCell.className = "px-4 py-3";
    const statusSelect = document.createElement("select");
    statusSelect.className = "h-10 rounded-md border border-slate-300 px-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";
    ["ATIVO", "INATIVO"].forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status === "ATIVO" ? "Ativo" : "Inativo";
      statusSelect.append(option);
    });
    statusSelect.value = plano.status ?? "ATIVO";
    statusCell.append(statusSelect);

    const actionCell = document.createElement("td");
    actionCell.className = "px-4 py-3";
    const actionGroup = document.createElement("div");
    actionGroup.className = "flex flex-wrap gap-2";
    const editButton = createActionButton(
      "Editar",
      "h-10 rounded-md bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700",
    );
    const saveButton = createActionButton(
      "Salvar",
      "hidden h-10 rounded-md bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700",
    );
    const deleteButton = createActionButton(
      "Excluir",
      "h-10 rounded-md border border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50",
    );
    actionGroup.append(editButton, saveButton, deleteButton);
    actionCell.append(actionGroup);

    const control = {
      plano,
      valorInput,
      mesesInput,
      descontoInput,
      statusSelect,
      editButton,
      saveButton,
    };
    setFieldState(control, false);

    function updateCalculatedValue() {
      if (!shouldCalculateValue(plano)) return;

      const planoDraft = readPlanoControl(control);
      planoDraft.desconto = normalizeDesconto(descontoInput.value);
      valorInput.value = calculateDraftValue(planoDraft).toFixed(2);
    }

    mesesInput.addEventListener("input", updateCalculatedValue);
    descontoInput.addEventListener("input", updateCalculatedValue);
    descontoInput.addEventListener("blur", () => {
      descontoInput.value = normalizeDesconto(descontoInput.value);
      updateCalculatedValue();
    });

    editButton.addEventListener("click", () => {
      setFieldState(control, true);
      valorInput.focus();
    });

    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      saveButton.textContent = "Salvando...";

      descontoInput.value = normalizeDesconto(descontoInput.value);
      const nextPlano = readPlanoControl(control);
      nextPlano.valor = calculateDraftValue(nextPlano);
      valorInput.value = nextPlano.valor.toFixed(2);
      const validationMessage = validatePlano(nextPlano);

      if (validationMessage) {
        saveButton.disabled = false;
        saveButton.textContent = "Salvar";
        showPlanosMessage(validationMessage, "warning");
        return;
      }

      const { error } = await salvarPlano(supabase, nextPlano);

      saveButton.disabled = false;
      saveButton.textContent = "Salvar";

      if (error) {
        showPlanosMessage("Não foi possível salvar o plano. Tente novamente.", "warning");
        return;
      }

      showPlanosMessage(`${plano.nome} atualizado. Novos cadastros e renovações já usam ${formatCurrencyBR(nextPlano.valor)}.`);
      await carregarPlanos();
    });

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Deseja excluir o plano ${plano.nome}?`);
      if (!confirmed) return;

      deleteButton.disabled = true;
      deleteButton.textContent = "Excluindo...";

      const { error } = await excluirPlano(supabase, plano.nome);

      if (error) {
        deleteButton.disabled = false;
        deleteButton.textContent = "Excluir";
        showPlanosMessage("Não foi possível excluir o plano. Tente novamente.", "warning");
        return;
      }

      showPlanosMessage(`${plano.nome} excluído com sucesso.`);
      await carregarPlanos();
    });

    row.append(nomeCell, valorCell, mesesCell, descontoCell, statusCell, actionCell);
    planosLista.append(row);
  });
}

function setupNovoPlanoForm() {
  const nomeInput = novoPlanoForm?.elements.nome;
  const mesesInput = novoPlanoForm?.elements.meses;
  const valorInput = novoPlanoForm?.elements.valor;
  const descontoInput = novoPlanoForm?.elements.desconto;

  function updateNovoPlanoValue() {
    if (!novoPlanoForm || !valorInput) return;

    const planoDraft = {
      nome: nomeInput?.value.trim(),
      meses: Number(mesesInput?.value),
      valor: Number(valorInput.value),
      desconto: normalizeDesconto(descontoInput?.value),
      ordem: Math.max(0, ...planosAtuais.map((plano) => Number(plano.ordem ?? 0))) + 1,
    };

    if (!shouldCalculateValue(planoDraft)) return;
    valorInput.value = calculateDraftValue(planoDraft).toFixed(2);
  }

  novoPlanoButton?.addEventListener("click", () => {
    novoPlanoForm?.classList.toggle("hidden");
  });

  mesesInput?.addEventListener("input", updateNovoPlanoValue);
  descontoInput?.addEventListener("input", updateNovoPlanoValue);
  descontoInput?.addEventListener("blur", () => {
    descontoInput.value = normalizeDesconto(descontoInput.value);
    updateNovoPlanoValue();
  });

  novoPlanoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(novoPlanoForm);
    const ordem = Math.max(0, ...planosAtuais.map((plano) => Number(plano.ordem ?? 0))) + 1;
    const planoDraft = {
      nome: formData.get("nome")?.trim(),
      meses: Number(formData.get("meses")),
      valor: Number(formData.get("valor")),
      desconto: normalizeDesconto(formData.get("desconto")),
      status: formData.get("status") || "ATIVO",
      ordem,
    };
    planoDraft.valor = calculateDraftValue(planoDraft);

    const validationMessage = validatePlano(planoDraft);
    if (validationMessage) {
      showPlanosMessage(validationMessage, "warning");
      return;
    }

    if (planosAtuais.some((plano) => plano.nome.toLowerCase() === planoDraft.nome.toLowerCase())) {
      showPlanosMessage("Já existe um plano com esse nome.", "warning");
      return;
    }

    const { error } = await salvarPlano(supabase, planoDraft);
    if (error) {
      showPlanosMessage("Não foi possível cadastrar o plano. Tente novamente.", "warning");
      return;
    }

    novoPlanoForm.reset();
    novoPlanoForm.classList.add("hidden");
    showPlanosMessage(`${planoDraft.nome} cadastrado com sucesso.`);
    await carregarPlanos();
  });
}

const canAccessPage = await protectPage();

if (canAccessPage) {
  setupNovoPlanoForm();
  await carregarPlanos();
}
