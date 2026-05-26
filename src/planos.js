const STORAGE_KEY = "academia-planos";

export const defaultPlanos = [
  {
    nome: "Mensal",
    meses: 1,
    valor: 80,
    desconto: "Sem desconto",
    status: "ATIVO",
    ordem: 1,
  },
  {
    nome: "Trimestral",
    meses: 3,
    valor: 216,
    desconto: "10%",
    status: "ATIVO",
    ordem: 2,
  },
  {
    nome: "Semestral",
    meses: 6,
    valor: 408,
    desconto: "15%",
    status: "ATIVO",
    ordem: 3,
  },
];

function normalizePlano(plano, index = 0) {
  return {
    nome: plano.nome ?? plano.plano ?? "",
    meses: Number(plano.meses ?? 1),
    valor: Number(plano.valor ?? 0),
    desconto: normalizeDesconto(plano.desconto ?? "Sem desconto"),
    status: plano.status ?? "ATIVO",
    ordem: Number(plano.ordem ?? index + 1),
  };
}

export function normalizePlanos(planos) {
  return (planos?.length ? planos : defaultPlanos)
    .map(normalizePlano)
    .filter((plano) => plano.nome)
    .sort((first, second) => first.ordem - second.ordem);
}

export function parseDiscountPercent(value) {
  if (typeof value === "number") {
    return Math.min(Math.max(value, 0), 100);
  }

  const text = String(value ?? "").trim().toLowerCase();
  if (!text || text.includes("sem")) return 0;

  const match = text.replace(",", ".").match(/\d+(\.\d+)?/);
  if (!match) return 0;

  return Math.min(Math.max(Number(match[0]), 0), 100);
}

export function normalizeDesconto(value) {
  const percent = parseDiscountPercent(value);
  if (!percent) return "Sem desconto";
  return `${percent}%`;
}

export function getPlanoMensal(planos) {
  return planos.find((plano) => plano.nome.toLowerCase() === "mensal") ?? planos[0] ?? defaultPlanos[0];
}

export function calcularValorPlano(plano, planoMensal = defaultPlanos[0]) {
  const meses = Math.max(Number(plano.meses ?? 1), 1);
  const valorMensal = Number(planoMensal?.valor ?? plano.valor ?? 0);

  if (plano.nome?.toLowerCase() === "mensal" || Number(plano.ordem) === 1) {
    return roundCurrency(Number(plano.valor ?? valorMensal));
  }

  const desconto = parseDiscountPercent(plano.desconto);
  return roundCurrency(valorMensal * meses * (1 - desconto / 100));
}

function roundCurrency(value) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

function getStoredPlanos() {
  try {
    return normalizePlanos(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return defaultPlanos;
  }
}

function setStoredPlanos(planos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePlanos(planos)));
}

export async function getPlanos(supabase, { ativosOnly = false } = {}) {
  const { data, error } = await supabase
    .from("planos_academia")
    .select("nome, meses, valor, desconto, status, ordem")
    .order("ordem", { ascending: true });

  const planos = error ? getStoredPlanos() : normalizePlanos(data);
  if (!error) setStoredPlanos(planos);

  return ativosOnly ? planos.filter((plano) => plano.status !== "INATIVO") : planos;
}

export async function salvarPlano(supabase, plano) {
  const normalized = normalizePlano(plano);
  const storedPlanos = getStoredPlanos();
  const nextPlanos = storedPlanos.map((item) =>
    item.nome === normalized.nome ? { ...item, ...normalized } : item,
  );

  if (!nextPlanos.some((item) => item.nome === normalized.nome)) {
    nextPlanos.push(normalized);
  }

  setStoredPlanos(nextPlanos);

  const { error } = await supabase
    .from("planos_academia")
    .upsert(
      {
        nome: normalized.nome,
        meses: normalized.meses,
        valor: normalized.valor,
        desconto: normalized.desconto,
        status: normalized.status,
        ordem: normalized.ordem,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "nome" },
    );

  return { error };
}

export async function excluirPlano(supabase, nome) {
  const storedPlanos = getStoredPlanos();
  setStoredPlanos(storedPlanos.filter((plano) => plano.nome !== nome));

  const { error } = await supabase
    .from("planos_academia")
    .delete()
    .eq("nome", nome);

  return { error };
}

export function planosToMap(planos) {
  return Object.fromEntries(normalizePlanos(planos).map((plano) => [plano.nome, plano]));
}

export function formatCurrencyBR(value) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function planoOptionLabel(plano) {
  const desconto = plano.desconto && plano.desconto !== "Sem desconto" ? ` (${plano.desconto} de desconto)` : "";
  return `${plano.nome} - ${formatCurrencyBR(plano.valor)}${desconto}`;
}
