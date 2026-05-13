import { supabase } from "./supabase.js";

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

const { data } = await supabase.auth.getSession();
let canAccessAdmin = false;

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
  } else if (profile?.tipo_usuario !== "ADMIN" || profile?.status === "INATIVO") {
    await supabase.auth.signOut();
    window.location.href = "/";
  } else {
    canAccessAdmin = true;
    email.textContent = `Admin logado: ${data.session.user.email}`;
  }
}

if (!canAccessAdmin) {
  await new Promise(() => {});
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

function getMonthStart() {
  const today = todayAsDate();
  return toInputDate(new Date(today.getFullYear(), today.getMonth(), 1));
}

function getNextMonthStart() {
  const today = todayAsDate();
  return toInputDate(new Date(today.getFullYear(), today.getMonth() + 1, 1));
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

async function carregarFinanceiro() {
  const monthStart = getMonthStart();
  const nextMonthStart = getNextMonthStart();
  const today = toInputDate(todayAsDate());

  const { data: pagamentos, error } = await supabase
    .from("pagamentos_matriculas")
    .select("valor, plano, forma_pagamento, status, pago_em, alunos(nome_completo)")
    .eq("status", "PAGO")
    .gte("pago_em", monthStart)
    .lt("pago_em", nextMonthStart)
    .order("pago_em", { ascending: false });

  if (error) {
    if (financeiroLista) {
      financeiroLista.innerHTML = "";
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.className = "px-4 py-6 text-center text-red-600";
      cell.colSpan = 5;
      cell.textContent = `Erro ao carregar financeiro: ${error.message}`;
      row.append(cell);
      financeiroLista.append(row);
    }
    return;
  }

  const pagamentosMes = pagamentos ?? [];
  const totalMes = pagamentosMes.reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  const totalHoje = pagamentosMes
    .filter((item) => item.pago_em?.slice(0, 10) === today)
    .reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  const pagamentosHoje = pagamentosMes.filter((item) => item.pago_em?.slice(0, 10) === today).length;

  if (receitaMes) receitaMes.textContent = formatCurrencyBR(totalMes);
  if (receitaHoje) receitaHoje.textContent = formatCurrencyBR(totalHoje);
  if (financeiroReceitaMes) financeiroReceitaMes.textContent = formatCurrencyBR(totalMes);
  if (financeiroReceitaHoje) financeiroReceitaHoje.textContent = formatCurrencyBR(totalHoje);
  if (financeiroPagamentosMes) financeiroPagamentosMes.textContent = pagamentosMes.length;
  if (alertaPagamentosHoje) alertaPagamentosHoje.textContent = pagamentosHoje;

  if (!financeiroLista) return;

  financeiroLista.innerHTML = "";

  if (pagamentosMes.length === 0) {
    financeiroLista.innerHTML = `
      <tr>
        <td class="px-4 py-6 text-center text-slate-500" colspan="5">Nenhum pagamento registrado neste mes.</td>
      </tr>
    `;
    return;
  }

  pagamentosMes.slice(0, 10).forEach((pagamento) => {
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

await carregarFinanceiro();

async function carregarAcessosEAlertas() {
  const today = toInputDate(todayAsDate());
  const tomorrow = getTomorrow();
  const sevenDays = getSevenDaysFromNow();

  const { count: liberadosHoje } = await supabase
    .from("acessos_catraca")
    .select("*", { count: "exact", head: true })
    .eq("liberado", true)
    .gte("registrado_em", today)
    .lt("registrado_em", tomorrow);

  const { count: bloqueadosHoje } = await supabase
    .from("acessos_catraca")
    .select("*", { count: "exact", head: true })
    .eq("liberado", false)
    .gte("registrado_em", today)
    .lt("registrado_em", tomorrow);

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

await carregarAcessosEAlertas();

async function carregarProfessores() {
  if (!professoresLista) return;

  const { data: professoresCadastrados, error } = await supabase
    .from("professores")
    .select("id, nome_completo, email, telefone, especialidade, cref, status")
    .eq("status", "ATIVO")
    .order("created_at", { ascending: false });

  if (error) {
    professoresLista.className = "rounded-md border border-red-200 bg-red-50 p-6 text-center";
    professoresLista.innerHTML = "";

    const title = document.createElement("p");
    title.className = "font-semibold text-red-700";
    title.textContent = "Erro ao carregar professores.";

    const description = document.createElement("p");
    description.className = "mt-1 text-sm text-red-600";
    description.textContent = error.message;

    professoresLista.append(title, description);
    return;
  }

  if (!professoresCadastrados?.length) {
    professoresLista.className = "rounded-md border border-dashed border-slate-300 p-6 text-center";
    professoresLista.innerHTML = `
      <p class="font-semibold text-slate-700">Nenhum professor ativo.</p>
      <p class="mt-1 text-sm text-slate-500">
        Professores inativos ficam ocultos nesta lista. Use editar dados e status para reativar.
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
        <th class="px-4 py-3 font-bold">Especialidade</th>
        <th class="px-4 py-3 font-bold">Contato</th>
        <th class="px-4 py-3 font-bold">CREF</th>
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
      <td class="px-4 py-4">
        <span class="rounded-md px-2 py-1 text-xs font-bold ${statusClass}"></span>
      </td>
      <td class="px-4 py-4">
        <a class="font-bold text-orange-700" href="/admin/editar-professor.html?id=${professor.id}">Editar</a>
      </td>
    `;

    row.querySelector("strong").textContent = professor.nome_completo;
    row.querySelector("span").textContent = professor.email;
    row.children[1].textContent = professor.especialidade;
    row.children[2].textContent = professor.telefone || "Sem telefone";
    row.children[3].textContent = professor.cref || "Nao informado";
    row.children[4].querySelector("span").textContent = professor.status || "ATIVO";

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  professoresLista.appendChild(table);
}

await carregarProfessores();

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
});
