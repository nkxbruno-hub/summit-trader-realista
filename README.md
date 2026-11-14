# Summit Trader Realista + Mentor AI

## Landing page

A página de campanha está disponível em `/` e apresenta o Summit Trader Realista de 19/12/2026, com CTA para o Instagram oficial `@traderrealista`. O destino do botão pode ser trocado pela variável `CHECKOUT_URL` quando houver um checkout ou formulário de inscrição.

MVP de um assistente que responde alunos usando o perfil do aluno e materiais aprovados pelo mentor.

## Regras do MVP

- Resposta em português, com no máximo 4 linhas.
- A IA usa somente o material encontrado para a pergunta.
- Quando não houver segurança, encaminha para o mentor.
- O assistente deve ser apresentado como IA, não como o mentor humano.

## Executar

```bash
npm install
npm run dev
```

Teste:

```bash
curl -X POST http://localhost:3000/chat -H "content-type: application/json" -d '{"message":"Estou sem motivação para continuar", "profile":{"name":"Ana","goal":"estudar para uma prova","level":"iniciante"}}'
```

## Ollama opcional

Instale o Ollama, baixe um modelo e copie `.env.example` para `.env`:

```bash
ollama pull qwen2.5:3b
```

Sem Ollama, o MVP utiliza uma resposta determinística baseada nos materiais de `data/mentor.json`.

## WhatsApp Cloud API

O backend possui os endpoints oficiais:

- `GET /webhook/whatsapp`: verificação do webhook da Meta.
- `POST /webhook/whatsapp`: recebe texto, usa o perfil do aluno e envia a resposta.

Configure as variáveis do `.env.example` em um `.env`. Nunca publique o token de acesso ou o segredo do app.

O servidor lê automaticamente o arquivo `.env` quando ele existir. Faça uma cópia de `.env.example` com esse nome e preencha os valores.

Na Meta, o callback URL será `https://SEU-DOMINIO/webhook/whatsapp` e o token de verificação deverá ser o mesmo valor de `WHATSAPP_VERIFY_TOKEN`. Para produção, o endpoint precisa estar disponível por HTTPS.

### Hospedagem gratuita sugerida

O projeto inclui `Dockerfile` e `render.yaml` para publicar como Web Service gratuito no Render. Depois de conectar este projeto a um repositório GitHub, crie o serviço a partir do `render.yaml`, preencha as variáveis secretas e use a URL HTTPS fornecida pela plataforma no webhook da Meta.
