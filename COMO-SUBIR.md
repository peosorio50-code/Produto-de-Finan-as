# Fôlego: como subir (versão no padrão do Meu Santo Protetor)

O Fôlego agora funciona igual aos outros produtos da casa:

- **Site estático** (a pasta `out/` deste projeto) no **Cloudflare Pages**, com o domínio `folegofinanceiro.shop`. Não precisa de túnel.
- **Servidor**: as rotas do Fôlego ficam dentro do servidor Python do Meu Santo Protetor (`/opt/mapadaalma`, arquivo `folego.py`). O site chama `https://api.mapadaalma.online/api/folego/...`.
- **Kiwify**: o webhook do Fôlego usa **a mesma URL** do Meu Santo (`https://api.mapadaalma.online/webhook/kiwify/<segredo>`). O servidor reconhece o produto pela palavra **"folego"** no nome e manda a venda para o `folego.py`.

O passo a passo completo (com os comandos) está em `FOLEGO-como-subir.md`, no kit.

## Mudar o site
1. Edite o código (React/Next, igual antes).
2. `npm run build` gera a pasta `out/`.
3. Compacte o conteúdo de `out/` e faça um novo deploy no projeto do Pages.

Variáveis do build (opcionais, no comando do build):
- `NEXT_PUBLIC_API`: padrão `https://api.mapadaalma.online`.
- `NEXT_PUBLIC_CONTATO_EMAIL`: e-mail de atendimento mostrado no site (vazio esconde os links).
- `NEXT_PUBLIC_REENVIO=1`: mostra o "receber o link por e-mail" (só depois de configurar o remetente do Fôlego na Resend).
- `NEXT_PUBLIC_VENDA_ABERTA=0`: fecha a venda ("Em breve").

## Mudar a parte do servidor
É o arquivo `folego.py`, no servidor do Meu Santo (`/opt/mapadaalma`): rotas, webhook, IA (prompt `SISTEMA` e esquema `ESQUEMA`), e-mail e comandos. O prompt é o mesmo que estava em `lib/ia.ts`.
