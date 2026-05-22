import { supabase } from "./supabase.js";
import { calcularValorPlano, getPlanoMensal, getPlanos, normalizeDesconto, salvarPlano } from "./planos.js";

const email = document.querySelector("#user-email");
const logoutButton = document.querySelector("#logout-button");
const totalAlunos = document.querySelector("#total-alunos");
const alunosAtivos = document.querySelector("#alunos-ativos");
const matriculasVencidas = document.querySelector("#matriculas-vencidas");
const receitaMes = document.querySelector("#receita-mes");
const receitaHoje = document.querySelector("#receita-hoje");
const acessosLiberadosHoje = document.querySelector("#acessos-liberados-hoje");
const acessosBloqueadosHoje = document.querySelector("#acessos-bloqueados-hoje");
const alertaVencendo = document.querySelector("#alerta-vencendo");
const alertaBloqueios = document.querySelector("#alerta-bloqueios");
const alertaAcessosNegados = document.querySelector("#alerta-acessos-negados");
const alertaPagamentosHoje = document.querySelector("#alerta-pagamentos-hoje");
const alertasLista = document.querySelector("#alertas-lista");
const financeiroReceitaMes = document.querySelector("#financeiro-receita-mes");
const financeiroReceitaHoje = document.querySelector("#financeiro-receita-hoje");
const financeiroPagamentosMes = document.querySelector("#financeiro-pagamentos-mes");
const financeiroVencidas = document.querySelector("#financeiro-vencidas");
const financeiroLista = document.querySelector("#financeiro-lista");
const professoresAtivos = document.querySelector("#professores-ativos");
const professoresLista = document.querySelector("#professores-lista");
const planosLista = document.querySelector("#planos-lista");
const planosMessage = document.querySelector("#planos-message");
const periodoButtons = document.querySelectorAll("[data-periodo]");
const periodoData = document.querySelector("#periodo-data");
const periodoLabel = document.querySelector("#periodo-label");
const backofficeRoles = ["ADMIN", "GERENTE", "ADMINISTRATIVO", "RECEPCAO"];
let periodoAtual = "dia";

const { data } = await supabase.auth.getSession();
let canAccessAdmin = false;
let currentRole = null;

if (!data.session) {
  window.location.href = "/";
} else {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tipo_usuario, status")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (profile?.tipo_usuario === "PROFESSOR") {
    window.location.href = "/professor/menu.html";
  } else if (!backofficeRoles.includes(profile?.tipo_usuario) || profile?.status === "INATIVO") {
    await supabase.auth.signOut();
    window.location.href = "/";
  } else {
    canAccessAdmin = true;
    currentRole = profile.tipo_usuario;
    email.textContent = `Acesso: ${data.session.user.email}`;
  }
}

if (!canAccessAdmin) {
  await new Promise(() => {});
}

function applyRoleNavigation() {
  if (["ADMIN", "GERENTE"].includes(currentRole)) return;

  document.querySelectorAll('a[href="#professores"], a[href="/admin/ver-professores.html"], a[href="/admin/cadastrar-professor.html"], a[href="/admin/editar-professor.html"], a[href="/admin/excluir-professor.html"]').forEach((element) => {
    element.classList.add("hidden");
  });

  const funcionariosSection = document.querySelector("#professores");
  funcionariosSection?.classList.add("hidden");
}

applyRoleNavigation();

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

function fromInputDate(value) {
  if (!value) return todayAsDate();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateBR(date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function desativarMatriculasVencidas() {
  const today = toInputDate(todayAsDate());

  await supabase
    .from("alunos")
    .update({ status: "INATIVO" })
    .eq("status", "ATIVO")
    .lt("validade_matricula", today);
}

await desativarMatriculasVencidas();

function formatCurrencyBR(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function showPlanosMessage(text, type = "success") {
  if (!planosMessage) return;
  planosMessage.textContent = text;
  planosMessage.className =
    type === "success"
      ? "mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
      : "mb-4 rounded-md bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700";
}

function getSevenDaysFromNow() {
  const today = todayAsDate();
  today.setDate(today.getDate() + 7);
  return toInputDate(today);
}

function getPeriodoRange() {
  const baseDate = periodoAtual === "data" ? fromInputDate(periodoData?.value) : todayAsDate();

  if (periodoAtual === "semana") {
    const day = baseDate.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const startDate = addDays(baseDate, mondayOffset);
    const endDate = addDays(startDate, 7);

    return {
      start: toInputDate(startDate),
      end: toInputDate(endDate),
      label: `Semana de ${formatDateBR(startDate)} a ${formatDateBR(addDays(endDate, -1))}`,
    };
  }

  const endDate = addDays(baseDate, 1);
  return {
    start: toInputDate(baseDate),
    end: toInputDate(endDate),
    label: periodoAtual === "dia" ? "Hoje" : formatDateBR(baseDate),
  };
}

function updatePeriodoControls() {
  periodoButtons.forEach((button) => {
    const isActive = button.dataset.periodo === periodoAtual;
    button.className = isActive
      ? "h-10 rounded-md bg-orange-600 px-4 text-sm font-bold text-white"
      : "h-10 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-orange-300 hover:bg-orange-50";
  });

  periodoData?.classList.toggle("hidden", periodoAtual !== "data");

  const range = getPeriodoRange();
  if (periodoLabel) periodoLabel.textContent = range.label;
}

const { count: total } = await supabase
  .from("alunos")
  .select("*", { count: "exact", head: true });

const { count: ativos } = await supabase
  .from("alunos")
  .select("*", { count: "exact", head: true })
  .eq("status", "ATIVO");

const { count: vencidas } = await supabase
  .from("alunos")
  .select("*", { count: "exact", head: true })
  .lt("validade_matricula", toInputDate(todayAsDate()));

const { count: professores } = await supabase
  .from("professores")
  .select("*", { count: "exact", head: true })
  .eq("status", "ATIVO");

if (totalAlunos) totalAlunos.textContent = total ?? 0;
if (alunosAtivos) alunosAtivos.textContent = ativos ?? 0;
if (matriculasVencidas) matriculasVencidas.textContent = vencidas ?? 0;
if (financeiroVencidas) financeiroVencidas.textContent = vencidas ?? 0;
if (professoresAtivos) professoresAtivos.textContent = professores ?? 0;

async function carregarFinanceiro(periodo) {
  const { data: pagamentos, error } = await supabase
    .from("pagamentos_matriculas")
    .select("valor, plano, forma_pagamento, status, pago_em, alunos(nome_completo)")
    .eq("status", "PAGO")
    .gte("pago_em", periodo.start)
    .lt("pago_em", periodo.end)
    .order("pago_em", { ascending: false });

  if (error) {
    if (financeiroLista) {
      financeiroLista.innerHTML = "";
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.className = "px-4 py-6 text-center text-red-600";
      cell.colSpan = 5;
      cell.textContent = "Nao foi possivel carregar os dados financeiros.";
      row.append(cell);
      financeiroLista.append(row);
    }
    return;
  }

  const pagamentosPeriodo = pagamentos ?? [];
  const totalPeriodo = pagamentosPeriodo.reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  const ticketMedio = pagamentosPeriodo.length ? totalPeriodo / pagamentosPeriodo.length : 0;

  if (receitaMes) receitaMes.textContent = formatCurrencyBR(totalPeriodo);
  if (receitaHoje) receitaHoje.textContent = String(pagamentosPeriodo.length);
  if (financeiroReceitaMes) financeiroReceitaMes.textContent = formatCurrencyBR(totalPeriodo);
  if (financeiroReceitaHoje) financeiroReceitaHoje.textContent = String(pagamentosPeriodo.length);
  if (financeiroPagamentosMes) financeiroPagamentosMes.textContent = formatCurrencyBR(ticketMedio);
  if (alertaPagamentosHoje) alertaPagamentosHoje.textContent = pagamentosPeriodo.length;

  if (!financeiroLista) return;

  financeiroLista.innerHTML = "";

  if (pagamentosPeriodo.length === 0) {
    financeiroLista.innerHTML = `
      <tr>
        <td class="px-4 py-6 text-center text-slate-500" colspan="5">Nenhum pagamento no periodo.</td>
      </tr>
    `;
    return;
  }

  pagamentosPeriodo.slice(0, 10).forEach((pagamento) => {
    const row = document.createElement("tr");
    const pagoEm = pagamento.pago_em
      ? new Date(pagamento.pago_em).toLocaleString("pt-BR")
      : "-";

    [pagoEm, pagamento.alunos?.nome_completo ?? "-", pagamento.plano ?? "-", pagamento.forma_pagamento ?? "-", formatCurrencyBR(Number(pagamento.valor ?? 0))].forEach((value) => {
      const cell = document.createElement("td");
      cell.className = "px-4 py-3";
      cell.textContent = value;
      row.append(cell);
    });

    financeiroLista.append(row);
  });
}

async function carregarAcessosEAlertas(periodo) {
  const today = toInputDate(todayAsDate());
  const sevenDays = getSevenDaysFromNow();

  const { count: liberadosHoje } = await supabase
    .from("acessos_catraca")
    .select("*", { count: "exact", head: true })
    .eq("liberado", true)
    .gte("registrado_em", periodo.start)
    .lt("registrado_em", periodo.end);

  const { count: bloqueadosHoje } = await supabase
    .from("acessos_catraca")
    .select("*", { count: "exact", head: true })
    .eq("liberado", false)
    .gte("registrado_em", periodo.start)
    .lt("registrado_em", periodo.end);

  const { data: vencendo } = await supabase
    .from("alunos")
    .select("nome_completo, validade_matricula")
    .eq("status", "ATIVO")
    .gte("validade_matricula", today)
    .lte("validade_matricula", sevenDays)
    .order("validade_matricula", { ascending: true });

  const { data: bloqueios } = await supabase
    .from("bloqueios_alunos")
    .select("motivo, bloqueado_em, alunos(nome_completo)")
    .eq("ativo", true)
    .order("bloqueado_em", { ascending: false });

  if (acessosLiberadosHoje) acessosLiberadosHoje.textContent = liberadosHoje ?? 0;
  if (acessosBloqueadosHoje) acessosBloqueadosHoje.textContent = bloqueadosHoje ?? 0;
  if (alertaVencendo) alertaVencendo.textContent = vencendo?.length ?? 0;
  if (alertaBloqueios) alertaBloqueios.textContent = bloqueios?.length ?? 0;
  if (alertaAcessosNegados) alertaAcessosNegados.textContent = bloqueadosHoje ?? 0;

  if (!alertasLista) return;

  alertasLista.innerHTML = "";

  const grupos = [
    {
      title: "Matriculas vencendo",
      empty: "Nenhuma matricula vencendo nos proximos 7 dias.",
      items: (vencendo ?? []).map((aluno) => `${aluno.nome_completo ?? "-"} vence em ${aluno.validade_matricula ?? "-"}`),
    },
    {
      title: "Bloqueios ativos",
      empty: "Nenhum bloqueio manual ativo.",
      items: (bloqueios ?? []).map((bloqueio) => `${bloqueio.alunos?.nome_completo ?? "-"}: ${bloqueio.motivo ?? "-"}`),
    },
  ];

  grupos.forEach((grupo) => {
    const card = document.createElement("article");
    card.className = "rounded-md border border-slate-200 p-4";

    const title = document.createElement("h3");
    title.className = "text-sm font-bold text-slate-950";
    title.textContent = grupo.title;

    const list = document.createElement("div");
    list.className = "mt-3 space-y-2 text-sm text-slate-600";

    if (grupo.items.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = grupo.empty;
      list.append(empty);
    } else {
      grupo.items.slice(0, 5).forEach((item) => {
        const p = document.createElement("p");
        p.textContent = item;
        list.append(p);
      });
    }

    card.append(title, list);
    alertasLista.append(card);
  });
}

async function carregarDadosPeriodo() {
  const periodo = getPeriodoRange();
  updatePeriodoControls();
  await carregarFinanceiro(periodo);
  await carregarAcessosEAlertas(periodo);
}

if (periodoData) {
  periodoData.value = toInputDate(todayAsDate());
  periodoData.addEventListener("change", async () => {
    periodoAtual = "data";
    await carregarDadosPeriodo();
  });
}

periodoButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    periodoAtual = button.dataset.periodo;
    if (periodoAtual === "dia" && periodoData) {
      periodoData.value = toInputDate(todayAsDate());
    }
    if (periodoAtual === "data" && periodoData && !periodoData.value) {
      periodoData.value = toInputDate(todayAsDate());
    }
    await carregarDadosPeriodo();
  });
});

await carregarDadosPeriodo();

async function carregarProfessores() {
  if (!professoresLista) return;

  const { data: professoresCadastrados, error } = await supabase
    .from("professores")
    .select("id, nome_completo, email, telefone, cargo, perfil_acesso, especialidade, cref, status")
    .eq("status", "ATIVO")
    .order("created_at", { ascending: false });

  if (error) {
    professoresLista.className = "rounded-md border border-red-200 bg-red-50 p-6 text-center";
    professoresLista.innerHTML = "";

    const title = document.createElement("p");
    title.className = "font-semibold text-red-700";
    title.textContent = "Nao foi possivel carregar os funcionarios.";

    const description = document.createElement("p");
    description.className = "mt-1 text-sm text-red-600";
    description.textContent = "Tente novamente em alguns instantes.";

    professoresLista.append(title, description);
    return;
  }

  if (!professoresCadastrados?.length) {
    professoresLista.className = "rounded-md border border-dashed border-slate-300 p-6 text-center";
    professoresLista.innerHTML = `
      <p class="font-semibold text-slate-700">Nenhum funcionario ativo.</p>
      <p class="mt-1 text-sm text-slate-500">
        Funcionarios inativos ficam ocultos nesta lista. Use editar dados e status para reativar.
      </p>
    `;
    return;
  }

  professoresLista.className = "overflow-x-auto";
  professoresLista.innerHTML = "";

  const table = document.createElement("table");
  table.className = "w-full min-w-[720px] text-left text-sm";

  table.innerHTML = `
    <thead class="bg-slate-100 text-slate-600">
      <tr>
        <th class="px-4 py-3 font-bold">Nome</th>
        <th class="px-4 py-3 font-bold">Cargo</th>
        <th class="px-4 py-3 font-bold">Perfil</th>
        <th class="px-4 py-3 font-bold">Area</th>
        <th class="px-4 py-3 font-bold">Contato</th>
        <th class="px-4 py-3 font-bold">Status</th>
        <th class="px-4 py-3 font-bold">Acoes</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  tbody.className = "divide-y divide-slate-100";

  professoresCadastrados.forEach((professor) => {
    const row = document.createElement("tr");
    const statusClass =
      professor.status === "ATIVO"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-600";

    row.innerHTML = `
      <td class="px-4 py-4">
        <strong class="block text-slate-950"></strong>
        <span class="mt-1 block text-xs text-slate-500"></span>
      </td>
      <td class="px-4 py-4 text-slate-700"></td>
      <td class="px-4 py-4 text-slate-700"></td>
      <td class="px-4 py-4 text-slate-700"></td>
      <td class="px-4 py-4 text-slate-700"></td>
      <td class="px-4 py-4">
        <span class="rounded-md px-2 py-1 text-xs font-bold ${statusClass}"></span>
      </td>
      <td class="px-4 py-4">
        <a class="font-bold text-orange-700" href="/admin/editar-professor.html?id=${professor.id}">Editar</a>
      </td>
    `;

    row.querySelector("strong").textContent = professor.nome_completo;
    row.querySelector("span").textContent = professor.email;
    row.children[1].textContent = professor.cargo || "Professor de musculacao";
    row.children[2].textContent = perfilLabel(professor.perfil_acesso || "PROFESSOR");
    row.children[3].textContent = professor.especialidade || "Nao informado";
    row.children[4].textContent = professor.telefone || "Sem telefone";
    row.children[5].querySelector("span").textContent = professor.status || "ATIVO";

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  professoresLista.appendChild(table);
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

await carregarProfessores();

async function carregarPlanos() {
  if (!planosLista) return;

  const planos = await getPlanos(supabase);
  const rowControls = [];
  planosLista.innerHTML = "";

  function readPlanoControl(control) {
    const isMensal = control.plano.nome.toLowerCase() === "mensal" || Number(control.plano.ordem) === 1;

    return {
      nome: control.plano.nome,
      meses: Number(control.mesesInput.value),
      valor: Number(control.valorInput.value),
      desconto: isMensal ? "Sem desconto" : normalizeDesconto(control.descontoInput.value),
      status: control.statusSelect.value,
      ordem: control.plano.ordem,
    };
  }

  function refreshCalculatedValues() {
    const mensalControl = rowControls.find((control) =>
      control.plano.nome.toLowerCase() === "mensal" || Number(control.plano.ordem) === 1,
    );
    const mensalPlano = mensalControl ? readPlanoControl(mensalControl) : getPlanoMensal(planos);

    rowControls.forEach((control) => {
      const isMensal = control.plano.nome.toLowerCase() === "mensal" || Number(control.plano.ordem) === 1;
      if (isMensal) return;

      const planoDraft = readPlanoControl(control);
      const valorCalculado = calcularValorPlano(planoDraft, mensalPlano);
      control.valorInput.value = valorCalculado.toFixed(2);
    });
  }

  planos.forEach((plano) => {
    const isMensal = plano.nome.toLowerCase() === "mensal" || Number(plano.ordem) === 1;
    const row = document.createElement("tr");
    row.dataset.plano = plano.nome;

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
    valorInput.readOnly = !isMensal;
    if (!isMensal) {
      valorInput.classList.add("bg-slate-100", "text-slate-600");
      valorInput.title = "Calculado automaticamente pelo mensal, duracao e desconto";
    }
    valorCell.append(valorInput);

    const mesesCell = document.createElement("td");
    mesesCell.className = "px-4 py-3";
    const mesesInput = document.createElement("input");
    mesesInput.className = "h-10 w-24 rounded-md border border-slate-300 px-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";
    mesesInput.type = "number";
    mesesInput.min = "1";
    mesesInput.step = "1";
    mesesInput.value = plano.meses;
    mesesInput.readOnly = isMensal;
    if (isMensal) {
      mesesInput.classList.add("bg-slate-100", "text-slate-600");
    }
    mesesCell.append(mesesInput);

    const descontoCell = document.createElement("td");
    descontoCell.className = "px-4 py-3";
    const descontoInput = document.createElement("input");
    descontoInput.className = "h-10 w-32 rounded-md border border-slate-300 px-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";
    descontoInput.value = plano.desconto ?? "Sem desconto";
    descontoInput.readOnly = isMensal;
    if (isMensal) {
      descontoInput.classList.add("bg-slate-100", "text-slate-600");
    }
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
    const saveButton = document.createElement("button");
    saveButton.className = "h-10 rounded-md bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700";
    saveButton.type = "button";
    saveButton.textContent = "Salvar";
    actionCell.append(saveButton);

    const controls = {
      plano,
      valorInput,
      mesesInput,
      descontoInput,
      statusSelect,
    };
    rowControls.push(controls);

    valorInput.addEventListener("input", refreshCalculatedValues);
    mesesInput.addEventListener("input", refreshCalculatedValues);
    descontoInput.addEventListener("input", refreshCalculatedValues);
    descontoInput.addEventListener("blur", () => {
      if (!isMensal) {
        descontoInput.value = normalizeDesconto(descontoInput.value);
        refreshCalculatedValues();
      }
    });

    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      saveButton.textContent = "Salvando...";

      if (!isMensal) {
        descontoInput.value = normalizeDesconto(descontoInput.value);
        refreshCalculatedValues();
      }

      const mensalControl = rowControls.find((control) =>
        control.plano.nome.toLowerCase() === "mensal" || Number(control.plano.ordem) === 1,
      );
      const mensalPlano = mensalControl ? readPlanoControl(mensalControl) : getPlanoMensal(planos);
      const nextPlano = readPlanoControl(controls);
      nextPlano.valor = isMensal ? Number(valorInput.value) : calcularValorPlano(nextPlano, mensalPlano);
      valorInput.value = Number(nextPlano.valor).toFixed(2);

      if (!Number.isFinite(nextPlano.valor) || nextPlano.valor < 0 || !Number.isFinite(nextPlano.meses) || nextPlano.meses < 1) {
        saveButton.disabled = false;
        saveButton.textContent = "Salvar";
        showPlanosMessage("Informe um valor maior ou igual a zero e uma duracao de pelo menos 1 mes.", "warning");
        return;
      }

      const { error: mensalError } = !isMensal && mensalControl
        ? await salvarPlano(supabase, mensalPlano)
        : { error: null };
      const { error } = await salvarPlano(supabase, nextPlano);

      saveButton.disabled = false;
      saveButton.textContent = "Salvar";

      if (error || mensalError) {
        showPlanosMessage(
          "Nao foi possivel concluir a atualizacao dos planos para todos os usuarios. Tente novamente ou acione o suporte tecnico.",
          "warning",
        );
        return;
      }

      showPlanosMessage(`${plano.nome} atualizado. Novos cadastros e renovacoes ja usam ${formatCurrencyBR(nextPlano.valor)}.`);
    });

    row.append(nomeCell, valorCell, mesesCell, descontoCell, statusCell, actionCell);
    planosLista.append(row);
  });

  refreshCalculatedValues();
}

await carregarPlanos();

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
});
