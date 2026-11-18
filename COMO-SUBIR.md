# Como subir o Fôlego

Ordem: **domínio → servidor (VPS) → Kiwify → IA → testes**. Cada comando diz
em qual terminal rodar:

- **Seu computador**: onde está o `folego-vps.zip`.
- **VPS**: `root@srv2014776` (a mesma VPS do Meu Santo Protetor).

Regras da VPS (do manual do Carlos): nunca reiniciar o Docker, nunca reiniciar
a máquina, nunca rodar `do-release-upgrade`. O instalador do Fôlego segue isso:
ele só mexe em `/opt/folego` e no serviço `folego`.

Chaves (Anthropic, Kiwify, Resend) **nunca** vão para o chat, para o WhatsApp
ou para documento: são coladas direto no `/opt/folego/.env`, na VPS.

---

## 1. Domínio

O Fôlego precisa de um domínio próprio (ex.: `folego.com.br`), **não** um
subdomínio do Meu Santo Protetor nem do Mapa da Alma: as marcas ficam separadas.

1. Compre o domínio e coloque-o na **mesma conta do Cloudflare** em que está o
   túnel `mapadaalma-vps`.
2. No Cloudflare: **Zero Trust → Networks → Tunnels → `mapadaalma-vps` →
   Public Hostname → Add a public hostname**.
   - Domain: o domínio do Fôlego (subdomínio vazio, ou `www` num segundo hostname)
   - Service: `HTTP` e `localhost:8020`
3. Se o túnel **não** aparecer como editável no painel (ele usa um arquivo
   `config.yml` na VPS), quem configurou o túnel precisa acrescentar a regra
   no arquivo e reiniciar o `cloudflared`. Isso derruba o `api.mapadaalma.online`
   por alguns segundos: faça num horário calmo.

---

## 2. Servidor (VPS)

**Seu computador** (na pasta onde está o zip):

```bash
scp -o ServerAliveInterval=20 folego-vps.zip root@2.25.252.204:/root/
```

**VPS:**

```bash
cd /root && rm -rf folego && unzip -q folego-vps.zip && bash folego/instalar.sh
```

Na primeira vez, ele cria o `/opt/folego/.env` com um segredo novo para o
webhook e termina mostrando `{"ok":true,...}`. Agora preencha a configuração:

**VPS:**

```bash
nano /opt/folego/.env
```

Preencha por enquanto: `SITE_URL` (ex.: `https://folego.com.br`),
`CONTATO_EMAIL` e `ANTHROPIC_API_KEY` (passo 4). `KIWIFY_CHECKOUT` e
`KIWIFY_TOKEN` vêm no passo 3. Salve (Ctrl+O, Enter, Ctrl+X) e reinicie:

**VPS:**

```bash
systemctl restart folego && sleep 4 && curl -s localhost:8020/api/saude
```

Abra o domínio no celular: o quiz tem que aparecer.

---

## 3. Kiwify (quem tem acesso: Carlos)

**3.1 Produto**

- Nome do produto com a palavra **Fôlego** (ex.: "Fôlego: plano de quitação
  de dívidas"). O servidor só reconhece avisos de produtos com "folego" no
  nome. Se o nome mudar, atualize `KIWIFY_PRODUTO` no `.env`.
- Preço **R$ 29,90**, pagamento único, Pix e cartão. Garantia de 7 dias.
- Checkout com as cores do Fôlego: fundo `#FFFFFF`, botão `#1C41D6`.
- **Página de obrigado** (URL externa): `https://SEU-DOMINIO/plano`.
- Confira o nome da loja que aparece no checkout: se for "Meu Santo Protetor",
  ele aparece também para quem compra o Fôlego.

O código do checkout é o trecho depois de `pay.kiwify.com.br/`. Vai em
`KIWIFY_CHECKOUT` no `.env`.

**3.2 Webhook**

O endereço do webhook tem o segredo dentro. Para não passar por chat, gere na
VPS e cole direto na Kiwify:

**VPS:**

```bash
echo "$(grep ^SITE_URL= /opt/folego/.env | cut -d= -f2-)/api/kiwify/$(grep ^KIWIFY_WEBHOOK_SEGREDO= /opt/folego/.env | cut -d= -f2-)"
```

Na Kiwify, em **Apps → Webhooks → Criar webhook**:

- URL: o endereço que o comando mostrou.
- Produto: **só o do Fôlego**.
- Eventos: compra aprovada, compra recusada, Pix gerado, boleto gerado,
  carrinho abandonado, compra reembolsada e chargeback.
- Copie o **token** que a Kiwify mostra e cole em `KIWIFY_TOKEN` no `.env`.

**3.3 O webhook do Meu Santo Protetor**

O webhook do Meu Santo Protetor está marcado para **todos os produtos**: ele
também vai receber as vendas do Fôlego. Escolha uma das opções:

- trocar esse webhook para receber **só os produtos católicos** (é o mais seguro);
- ou confirmar que o `servidor.py` ignora produto desconhecido, sem mandar
  e-mail nenhum (inclusive de recuperação de carrinho).

**3.4 Reiniciar com tudo preenchido**

**VPS:**

```bash
systemctl restart folego && sleep 4 && curl -s localhost:8020/api/saude
```

Tem que aparecer `"pagamento":"kiwify"`, `"webhookKiwify":true`,
`"assinaturaKiwify":true`, `"ia":true` e `"siteUrl":true`.

---

## 4. IA (créditos da Anthropic)

1. Em **platform.claude.com → API keys**, crie uma chave só para o Fôlego
   (ex.: "folego-vps"). Pode ser na mesma conta do Meu Santo Protetor.
   Uma chave separada mostra o gasto do Fôlego à parte e pode ser desligada
   sozinha.
2. Cole em `ANTHROPIC_API_KEY` no `/opt/folego/.env` e reinicie o serviço.
3. Em **Billing**, deixe a **recarga automática ligada** (ex.: recarregar
   US$ 50 quando o saldo cair abaixo de US$ 20). Foi a falta disso que deixou
   48 compras sem entrega no Meu Santo Protetor.
4. Custo esperado: de US$ 0,10 a 0,25 por plano. Mil vendas são uns US$ 100 a 250.

Se o crédito acabar, o comprador ainda recebe o plano (na versão escrita por
regras), e o `folego-admin status` avisa.

---

## 5. E-mail com o link do plano (opcional, mas recomendado)

Sem isso, o plano aparece na página de obrigado, e o link funciona em qualquer
aparelho, mas quem pagou o Pix depois e fechou a página não recebe o link.

1. Na Resend (o plano Pro do Carlos aceita mais domínios), adicione o domínio
   do Fôlego e configure o DNS que ela pede no Cloudflare.
2. Crie uma chave de API e cole no `.env`:
   - `RESEND_API_KEY=` a chave
   - `EMAIL_REMETENTE=Fôlego <plano@SEU-DOMINIO>`
3. Reinicie o serviço. O `/api/saude` passa a mostrar `"email":true`.

---

## 6. Testes antes de anunciar

1. No celular, faça o quiz até o fim com o seu e-mail.
2. Clique em comprar e pague de verdade com Pix (dá para pedir reembolso depois).
3. A página de obrigado tem que mostrar "Montando seu plano" e, em cerca de um
   minuto, o plano.
4. **VPS:**

   ```bash
   folego-admin buscar SEU-EMAIL
   ```

   A compra tem que estar `pago` e ligada a um pedido (`fl-...`). Se a coluna
   `ref` da compra estiver vazia, a Kiwify não devolveu o `sck`: a ligação
   pelo e-mail ainda funciona, mas me avise.
5. Ao vivo, enquanto testa:

   **VPS:**

   ```bash
   journalctl -u folego -f | grep --line-buffered "kiwify\|\[ia\]\|\[plano\]"
   ```

6. Peça o reembolso na Kiwify e confira se a compra vira `reembolsado`.

Se aparecer `assinatura não confere` no log, o token está errado. Confira o
`KIWIFY_TOKEN`. Para destravar na hora, deixe o `KIWIFY_TOKEN` vazio e reinicie:
o segredo do endereço continua protegendo o webhook.

---

## Dia a dia

Todos na **VPS**:

```bash
folego-admin status
```

```bash
folego-admin buscar EMAIL
```

```bash
folego-admin leads 30 > /root/leads.csv
```

O CSV tem dados pessoais (LGPD): baixe, use e apague com `rm /root/leads.csv`.

Para liberar à mão um pedido que não chegou pelo webhook (depois de conferir o
pagamento na Kiwify), use a referência `fl-...` que o `buscar` mostra:

```bash
folego-admin liberar fl-XXXXXXXXXXXX-XXXXXXXXXXXXXXXX
```

O backup do banco roda todo dia às 4h17 em `/opt/folego/backups` (guarda 14).

## Atualizar

Mesmo caminho do passo 2: `scp` do zip novo e `bash folego/instalar.sh`. O
`.env` e o banco ficam como estão.

Para voltar à versão anterior:

**VPS:**

```bash
cd /opt/folego && mv app app.quebrado && mv app.anterior app && systemctl restart folego
```
