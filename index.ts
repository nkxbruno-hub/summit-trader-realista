import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

type Material = { title: string; keywords: string[]; content: string };
type MentorData = {
  mentor: { name: string; method: string; tone: string; handoff: string };
  materials: Material[];
};
type StudentProfile = { name?: string; goal?: string; level?: string; blockers?: string[] };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data: MentorData = JSON.parse(await readFile(path.join(root, "data", "mentor.json"), "utf8"));

async function loadDotEnv(): Promise<void> {
  try {
    const content = await readFile(path.join(root, ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env é opcional: variáveis do ambiente continuam sendo aceitas.
  }
}

await loadDotEnv();
const port = Number(process.env.PORT ?? 3000);
const students = new Map<string, StudentProfile>();
const processedMessageIds = new Set<string>();

function landingPage(): string {
  const checkoutUrl = process.env.CHECKOUT_URL ?? "https://www.instagram.com/traderrealista/";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Summit Trader Realista: um dia inteiro para construir sua base no trade e transformar conhecimento em processo." />
  <title>Summit Trader Realista | Black Friday</title>
  <style>
    :root{--bg:#07100d;--surface:#0d1a15;--surface-2:#12231b;--line:#244233;--text:#f3f8f3;--muted:#a7b9ad;--green:#62e58c;--green-2:#1ca85d;--red:#ff666d;--gold:#ffc96b;--shadow:0 22px 80px #0008}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 80% 0,#183f2a66,transparent 35%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}a{color:inherit;text-decoration:none}.wrap{width:min(1140px,calc(100% - 40px));margin:auto}.topbar{border-bottom:1px solid #ffffff12;background:#07100dcc;backdrop-filter:blur(14px);position:relative;z-index:2}.topbar .wrap{height:68px;display:flex;align-items:center;justify-content:space-between}.brand{font-weight:900;letter-spacing:-.04em}.brand span{color:var(--green)}.pill{border:1px solid #ffffff25;border-radius:100px;padding:8px 14px;color:var(--muted);font-size:.78rem}.hero{position:relative;overflow:hidden;padding:76px 0 96px}.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:60px;align-items:center}.eyebrow{color:var(--green);font-size:.78rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.hero h1{font-size:clamp(2.6rem,6vw,5.55rem);line-height:.96;letter-spacing:-.075em;margin:18px 0 24px;max-width:720px}.hero h1 em{color:var(--green);font-style:normal}.hero p{font-size:1.16rem;color:var(--muted);max-width:590px;margin:0 0 30px}.cta-row{display:flex;gap:13px;flex-wrap:wrap;align-items:center}.btn{border:0;border-radius:12px;padding:15px 21px;font-weight:850;font-size:.96rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s transform,.2s background}.btn:hover{transform:translateY(-2px)}.btn-primary{background:var(--green);color:#041109;box-shadow:0 10px 35px #62e58c2b}.btn-primary:hover{background:#83efa4}.btn-secondary{background:transparent;border:1px solid #ffffff2a;color:var(--text)}.micro{font-size:.78rem;color:#7e9386;margin-top:15px}.chart-card{background:linear-gradient(145deg,#11271b,#0b1511);border:1px solid #ffffff17;border-radius:24px;padding:20px;box-shadow:var(--shadow);transform:rotate(1.5deg)}.chart-head{display:flex;justify-content:space-between;color:var(--muted);font-size:.78rem;margin-bottom:18px}.chart-head strong{color:var(--green)}.chart{height:300px;display:flex;align-items:flex-end;justify-content:space-around;gap:9px;border-bottom:1px solid #ffffff1c;background:repeating-linear-gradient(to bottom,transparent 0 59px,#ffffff0d 60px);position:relative}.chart:after{content:"";position:absolute;inset:28% -2% auto;height:2px;background:var(--green);opacity:.5;transform:rotate(-11deg)}.candle{width:14px;height:var(--h);background:var(--c);position:relative;border-radius:2px;box-shadow:0 0 12px color-mix(in srgb,var(--c),transparent 70%)}.candle:before,.candle:after{content:"";position:absolute;width:2px;background:var(--c);left:6px}.candle:before{height:var(--top);top:calc(var(--top) * -1)}.candle:after{height:var(--bottom);bottom:calc(var(--bottom) * -1)}.chart-label{display:flex;justify-content:space-between;padding-top:13px;color:#708579;font-size:.72rem}.ticker{display:flex;gap:22px;overflow:hidden;border-block:1px solid #ffffff10;padding:14px 0;color:#8ca095;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em}.ticker b{color:var(--green)}section{padding:96px 0}.section-kicker{color:var(--gold);font-size:.75rem;text-transform:uppercase;letter-spacing:.16em;font-weight:800}.section-title{font-size:clamp(2rem,4vw,3.5rem);letter-spacing:-.06em;line-height:1.02;margin:14px 0 18px}.section-copy{color:var(--muted);max-width:650px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:38px}.card{background:var(--surface);border:1px solid #ffffff12;border-radius:18px;padding:25px}.card .num{color:var(--green);font-weight:900;font-size:2rem}.card h3{margin:16px 0 8px;font-size:1.12rem}.card p{color:var(--muted);font-size:.93rem;margin:0}.dark{background:#091510}.agenda{display:grid;grid-template-columns:.8fr 1.2fr;gap:54px;align-items:start}.timeline{border-left:1px solid var(--line);padding-left:28px}.slot{position:relative;padding:0 0 29px}.slot:before{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:var(--green);left:-33px;top:7px;box-shadow:0 0 0 5px #62e58c1a}.slot time{font-size:.78rem;color:var(--green);font-weight:800}.slot h3{margin:4px 0 5px}.slot p{margin:0;color:var(--muted);font-size:.92rem}.offer{display:grid;grid-template-columns:1fr .8fr;gap:28px;align-items:center;background:linear-gradient(130deg,#143524,#0c1812);border:1px solid #62e58c42;border-radius:26px;padding:38px;box-shadow:var(--shadow)}.offer h2{font-size:clamp(2rem,4vw,3.5rem);line-height:1;letter-spacing:-.06em;margin:10px 0 15px}.offer p{color:var(--muted)}.price{background:#07100d;border:1px solid #ffffff18;border-radius:18px;padding:26px;text-align:center}.price small{color:var(--muted);text-decoration:line-through}.price strong{display:block;font-size:2.7rem;letter-spacing:-.06em;color:var(--green);margin:4px 0 16px}.spots{color:var(--gold);font-size:.8rem;font-weight:800;margin-bottom:17px}.faq{max-width:780px;margin-top:35px}.faq details{border-bottom:1px solid #ffffff18;padding:20px 0}.faq summary{cursor:pointer;font-weight:750}.faq p{color:var(--muted);margin:12px 0 0}.footer{padding:30px 0 50px;border-top:1px solid #ffffff10;color:#728579;font-size:.8rem;display:flex;justify-content:space-between;gap:20px}.footer a{color:var(--green)}@media(max-width:800px){.hero{padding:55px 0 65px}.hero-grid,.agenda,.offer{grid-template-columns:1fr;gap:32px}.hero h1{font-size:clamp(2.8rem,14vw,4.7rem)}.chart-card{transform:none}.cards{grid-template-columns:1fr}.offer{padding:26px}.footer{flex-direction:column}.topbar .pill{display:none}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn{transition:none}}
  </style>
</head>
<body>
  <header class="topbar"><div class="wrap"><a class="brand" href="#top">TRADER<span>REALISTA</span></a><div class="pill">BLACK FRIDAY · 10 VAGAS</div></div></header>
  <main id="top">
    <section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">19 de dezembro · Barra Funda, SP</div><h1>O mercado não precisa ser um <em>palpite.</em></h1><p>Um dia inteiro para sair da confusão, entender o trade do zero e construir uma estratégia positiva com processo, gestão e consistência.</p><div class="cta-row"><a class="btn btn-primary" href="#vagas">Quero minha vaga →</a><a class="btn btn-secondary" href="#agenda">Ver programação</a></div><div class="micro">Das 09h às 16h · Evento presencial · Conteúdo prático</div></div><div class="chart-card" aria-label="Gráfico decorativo de candles de alta e baixa"><div class="chart-head"><span>TRADER REALISTA / SUMMIT</span><strong>PROCESSO + CONSISTÊNCIA</strong></div><div class="chart">${[38,68,45,82,57,108,73,130,92,157,117,177,142,193].map((h, i) => `<i class="candle" style="--h:${h}px;--top:${10 + i % 4 * 5}px;--bottom:${8 + (i + 2) % 4 * 4}px;--c:${i % 4 === 1 ? 'var(--red)' : 'var(--green)'}"></i>`).join("")}</div><div class="chart-label"><span>BASE</span><span>ESTRATÉGIA</span><span>EXECUÇÃO</span></div></div></div></section>
    <div class="ticker"><div class="wrap"><span>LEITURA DE MERCADO</span> <b>▲ PROCESSO ANTES DO CLIQUE</b> <span>GESTÃO DE RISCO</span> <b>▲ DECISÃO COM CLAREZA</b></div></div>
    <section><div class="wrap"><div class="section-kicker">A virada de chave</div><h2 class="section-title">Você não precisa de mais uma promessa.<br/>Precisa de um método.</h2><p class="section-copy">O Summit Trader Realista foi desenhado para organizar o que parece complexo e transformar informação solta em uma rotina de decisão mais consciente — sem atalhos mágicos.</p><div class="cards"><article class="card"><div class="num">01</div><h3>Comece do ponto certo</h3><p>Entenda fundamentos, contexto e os principais conceitos para parar de operar no escuro.</p></article><article class="card"><div class="num">02</div><h3>Encontre sua estratégia</h3><p>Aprenda a conectar leitura, entrada, saída e gestão em um plano que possa ser testado.</p></article><article class="card"><div class="num">03</div><h3>Construa consistência</h3><p>Troque impulso por processo, registro e disciplina para evoluir operação após operação.</p></article></div></div></section>
    <section class="dark" id="agenda"><div class="wrap agenda"><div><div class="section-kicker">Um dia de imersão</div><h2 class="section-title">Da primeira vela à sua próxima decisão.</h2><p class="section-copy">Uma jornada progressiva, com linguagem direta e espaço para perguntas. Você sai com clareza sobre o que estudar e como praticar.</p></div><div class="timeline"><div class="slot"><time>09:00 · ABERTURA</time><h3>O jogo real do mercado</h3><p>Expectativas, erros comuns e o que realmente sustenta uma evolução.</p></div><div class="slot"><time>10:30 · FUNDAMENTOS</time><h3>Como ler o preço</h3><p>Estrutura, contexto e candles para interpretar movimentos com mais critério.</p></div><div class="slot"><time>13:30 · ESTRATÉGIA</time><h3>Do cenário ao plano</h3><p>Filtros, gatilhos, risco e como transformar uma ideia em regra testável.</p></div><div class="slot"><time>15:00 · CONSISTÊNCIA</time><h3>O plano de evolução</h3><p>Diário, revisão e próximos passos para praticar com responsabilidade.</p></div></div></div></section>
    <section id="vagas"><div class="wrap"><div class="offer"><div><div class="section-kicker">Condição especial de Black Friday</div><h2>10 pessoas.<br/>Uma sala. Um novo processo.</h2><p>As vagas são limitadas para manter a experiência próxima e permitir interação durante o dia. Reserve seu interesse pelo canal oficial do Trader Realista.</p><a class="btn btn-primary" href="${checkoutUrl}" target="_blank" rel="noreferrer">Garantir minha vaga →</a><div class="micro">A inscrição e os valores serão confirmados no canal oficial.</div></div><div class="price"><div class="spots">● RESTAM APENAS 10 VAGAS</div><small>BLACK FRIDAY</small><strong>SUMMIT 2026</strong><span style="color:var(--muted);font-size:.85rem">19/12 · 09h–16h<br/>Barra Funda · São Paulo</span></div></div></div></section>
    <section><div class="wrap"><div class="section-kicker">Perguntas rápidas</div><h2 class="section-title">Antes de tomar sua decisão.</h2><div class="faq"><details open><summary>Preciso já saber operar?</summary><p>Não. O conteúdo começa pela base e avança até a construção de uma estratégia. O importante é chegar disposto a aprender e praticar.</p></details><details><summary>O evento promete lucro?</summary><p>Não. Trade envolve risco e não existe garantia de resultado. O foco do Summit é educação, processo, gestão e tomada de decisão responsável.</p></details><details><summary>Onde será exatamente?</summary><p>Na região da Barra Funda, em São Paulo. O endereço completo e as orientações serão enviados após a confirmação da inscrição.</p></details><details><summary>Como faço para reservar?</summary><p>Clique em “Garantir minha vaga” e fale com o perfil oficial @traderrealista para confirmar disponibilidade e condições.</p></details></div></div></section>
  </main>
  <footer class="footer wrap"><span>© 2026 Trader Realista · Conteúdo educacional, não recomendação de investimento.</span><a href="https://www.instagram.com/traderrealista/" target="_blank" rel="noreferrer">@traderrealista ↗</a></footer>
</body></html>`;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function selectMaterial(message: string): Material | undefined {
  const normalized = normalize(message);
  const best = data.materials
    .map((material) => ({ material, score: material.keywords.filter((keyword) => normalized.includes(normalize(keyword))).length }))
    .sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.material : undefined;
}

function limitToFourLines(text: string): string {
  return text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 4).join("\n");
}

function fallbackReply(message: string, profile: StudentProfile): string {
  const material = selectMaterial(message);
  if (!material) return limitToFourLines(`${data.mentor.handoff}\n${data.mentor.name} poderá orientar o próximo passo.`);
  const context = [profile.name && ` ${profile.name}`, profile.goal && `, pensando em ${profile.goal}`].filter(Boolean).join("");
  return limitToFourLines(`Entendi${context}.\n${material.content}\nComece pelo menor passo possível hoje e me conte como foi.`);
}

async function ollamaReply(message: string, profile: StudentProfile, material?: Material): Promise<string | undefined> {
  const url = process.env.OLLAMA_URL;
  const model = process.env.OLLAMA_MODEL;
  if (!url || !model) return undefined;
  const prompt = [
    `Você é o assistente de ${data.mentor.name}. Seja ${data.mentor.tone}.`,
    "Responda em português brasileiro, em no máximo 4 linhas curtas.",
    "Use somente o contexto fornecido. Não invente. Se não houver resposta segura, encaminhe ao mentor.",
    `Perfil do aluno: ${JSON.stringify(profile)}`,
    `Material relevante: ${material?.content ?? "nenhum"}`,
    `Pergunta: ${message}`
  ].join("\n");
  try {
    const response = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!response.ok) return undefined;
    const body = await response.json() as { response?: string };
    return body.response ? limitToFourLines(body.response) : undefined;
  } catch {
    return undefined;
  }
}

async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await rawBody(request);
  return body ? JSON.parse(body) as Record<string, unknown> : {};
}

async function rawBody(request: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body;
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function isValidMetaSignature(raw: string, signature: string | undefined): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const received = signature.slice("sha256=".length);
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

async function sendWhatsAppText(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn("WhatsApp não configurado: resposta gerada para", to, text);
    return;
  }
  const version = process.env.META_GRAPH_VERSION ?? "v27.0";
  const result = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
  });
  if (!result.ok) throw new Error(`Falha ao enviar WhatsApp: ${result.status} ${await result.text()}`);
}

async function processWhatsAppWebhook(body: Record<string, unknown>): Promise<void> {
  const entries = Array.isArray(body.entry) ? body.entry as Record<string, unknown>[] : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes as Record<string, unknown>[] : [];
    for (const change of changes) {
      const value = (change.value ?? {}) as Record<string, unknown>;
      const messages = Array.isArray(value.messages) ? value.messages as Record<string, unknown>[] : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts as Record<string, unknown>[] : [];
      for (const incoming of messages) {
        if (incoming.type !== "text" || typeof incoming.from !== "string") continue;
        if (typeof incoming.id === "string") {
          if (processedMessageIds.has(incoming.id)) continue;
          processedMessageIds.add(incoming.id);
          if (processedMessageIds.size > 5000) processedMessageIds.delete(processedMessageIds.values().next().value as string);
        }
        const text = ((incoming.text ?? {}) as Record<string, unknown>).body;
        if (typeof text !== "string" || !text.trim()) continue;
        const contact = (contacts[0]?.profile ?? {}) as Record<string, unknown>;
        const existing = students.get(incoming.from) ?? {};
        const profile: StudentProfile = { ...existing, name: typeof contact.name === "string" ? contact.name : existing.name };
        students.set(incoming.from, profile);
        const material = selectMaterial(text);
        const answer = await ollamaReply(text, profile, material) ?? fallbackReply(text, profile);
        await sendWhatsAppText(incoming.from, answer);
      }
    }
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && (request.url === "/" || request.url === "/index.html")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" });
      return response.end(landingPage());
    }
    if (request.method === "GET" && request.url === "/health") return send(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/chat") {
      const body = await jsonBody(request);
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const profile = (body.profile ?? {}) as StudentProfile;
      if (!message) return send(response, 400, { error: "Envie uma mensagem em 'message'." });
      const material = selectMaterial(message);
      const answer = await ollamaReply(message, profile, material) ?? fallbackReply(message, profile);
      return send(response, 200, { answer, mentor: data.mentor.name, material: material?.title ?? null, maxLines: 4 });
    }
    if (request.method === "POST" && request.url === "/webhook/whatsapp") {
      const raw = await rawBody(request);
      const signatureHeader = request.headers["x-hub-signature-256"];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
      if (!isValidMetaSignature(raw, signature)) return send(response, 403, { error: "Assinatura inválida." });
      const body = JSON.parse(raw) as Record<string, unknown>;
      send(response, 200, { received: true });
      void processWhatsAppWebhook(body).catch((error) => console.error("Falha ao processar webhook WhatsApp:", error));
      return;
    }
    if (request.method === "GET" && request.url?.startsWith("/webhook/whatsapp")) {
      const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
        response.writeHead(200, { "content-type": "text/plain" });
        return response.end(challenge);
      }
      return send(response, 403, { error: "Verificação inválida." });
    }
    send(response, 404, { error: "Rota não encontrada." });
  } catch (error) {
    console.error(error);
    send(response, 400, { error: "Não foi possível processar a requisição." });
  }
});

server.listen(port, () => console.log(`Mentor AI MVP rodando em http://localhost:${port}`));
