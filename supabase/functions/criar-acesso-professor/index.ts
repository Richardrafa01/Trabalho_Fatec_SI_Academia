import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  professor_id: string;
  email: string;
  nome_completo: string;
  perfil_acesso?: string;
  cargo?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const defaultPassword = Deno.env.get("DEFAULT_FUNCIONARIO_PASSWORD") ?? Deno.env.get("DEFAULT_PROFESSOR_PASSWORD");
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";

    if (!supabaseUrl || !serviceRoleKey || !defaultPassword) {
      throw new Error("Configure as variaveis obrigatorias da Edge Function.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Nao autenticado." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: requesterData, error: requesterError } = await admin.auth.getUser(token);

    if (requesterError || !requesterData.user) {
      return json({ error: "Sessao invalida." }, 401);
    }

    const { data: requesterProfile } = await admin
      .from("profiles")
      .select("tipo_usuario")
      .eq("id", requesterData.user.id)
      .maybeSingle();

    if (requesterProfile && !["ADMIN", "GERENTE"].includes(requesterProfile.tipo_usuario)) {
      return json({ error: "Apenas administradores e gerentes podem criar acesso de funcionario." }, 403);
    }

    const payload = await req.json() as Payload;
    const email = payload.email?.trim().toLowerCase();
    const nomeCompleto = payload.nome_completo?.trim();
    const perfilAcesso = normalizePerfilAcesso(payload.perfil_acesso);

    if (!payload.professor_id || !email || !nomeCompleto) {
      return json({ error: "Dados obrigatorios ausentes." }, 400);
    }

    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        tipo_usuario: perfilAcesso,
        nome_completo: nomeCompleto,
        precisa_trocar_senha: true,
      },
    });

    const userAlreadyExists = createError?.message.toLowerCase().includes("already");

    if (createError && !userAlreadyExists) {
      return json({ error: createError.message }, 400);
    }

    let userId = createdUser.user?.id;

    if (!userId) {
      const { data: users } = await admin.auth.admin.listUsers();
      userId = users.users.find((user) => user.email?.toLowerCase() === email)?.id;
    }

    if (!userId) {
      return json({ error: "Nao foi possivel localizar o usuario criado." }, 400);
    }

    if (userAlreadyExists) {
      const { error: updateUserError } = await admin.auth.admin.updateUserById(userId, {
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          tipo_usuario: perfilAcesso,
          nome_completo: nomeCompleto,
          precisa_trocar_senha: true,
        },
      });

      if (updateUserError) {
        return json({ error: updateUserError.message }, 400);
      }
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      nome: nomeCompleto,
      nome_completo: nomeCompleto,
      email,
      tipo_usuario: perfilAcesso,
      precisa_trocar_senha: true,
      status: "ATIVO",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return json({ error: profileError.message }, 400);
    }

    const { error: professorError } = await admin
      .from("professores")
      .update({
        profile_id: userId,
        perfil_acesso: perfilAcesso,
        cargo: payload.cargo ?? "Funcionario",
        acesso_criado: true,
        acesso_criado_em: new Date().toISOString(),
      })
      .eq("id", payload.professor_id);

    if (professorError) {
      return json({ error: professorError.message }, 400);
    }

    const emailSent = await sendAccessEmail({
      to: email,
      nomeCompleto,
      defaultPassword,
      appUrl,
    });

    return json({
      ok: true,
      email_sent: emailSent,
      default_password: emailSent ? undefined : defaultPassword,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});

async function sendAccessEmail({
  to,
  nomeCompleto,
  defaultPassword,
  appUrl,
}: {
  to: string;
  nomeCompleto: string;
  defaultPassword: string;
  appUrl: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "Academia Pro <onboarding@resend.dev>";

  if (!resendApiKey) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Seu acesso ao sistema da academia foi criado",
      html: `
        <p>Ola, ${nomeCompleto}.</p>
        <p>Seu acesso ao sistema da academia foi criado.</p>
        <p><strong>E-mail:</strong> ${to}</p>
        <p><strong>Senha temporaria:</strong> ${defaultPassword}</p>
        <p>Acesse: <a href="${appUrl}">${appUrl}</a></p>
        <p>Altere sua senha no primeiro acesso.</p>
      `,
    }),
  });

  return response.ok;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizePerfilAcesso(value?: string) {
  const perfil = value?.trim().toUpperCase();
  const allowed = ["ADMIN", "GERENTE", "ADMINISTRATIVO", "RECEPCAO", "PROFESSOR"];
  return allowed.includes(perfil ?? "") ? (perfil as string) : "PROFESSOR";
}
