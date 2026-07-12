# Workflow de Atualização

Fluxos para atualizar userscript e addon. Seguir estes passos para manter tudo sincronizado.

---

## Atualização do Userscript

### Passo 1: Editar script.user.js

- Incrementar `@version` em `userscript/script.user.js`
- Fazer alterações no código

### Passo 2: Copiar para releases

```powershell
Copy-Item "userscript\script.user.js" -Destination "userscript\reddit_nsfw_unblur-{versao}.user.js"
```

Exemplo:
```powershell
Copy-Item "userscript\script.user.js" -Destination "userscript\reddit_nsfw_unblur-5.0.5.user.js"
```

### Passo 3: Publicar no Greasy Fork (manual)

1. Acessar https://greasyfork.org
2. Editar script existente
3. Substituir código pelo novo
4. Salvar e publicar

---

## Atualização do Addon

### Passo 1: Editar manifest.json

- Incrementar `version` em `addon/manifest.json`
- Manter sincronizado com userscript

### Passo 2: Alterações no código

- Modificar arquivos em `addon/`
- `content_scripts/bootstrap.js` — inicia extensão
- `content_scripts/content.js` — lógica principal

### Passo 3: Publicação automática

A publicação é automática via GitHub Actions:

1. Criar tag `v{versao}`
2. Push da tag trigger workflow
3. Workflow faz: lint → sign AMO → GitHub Release

---

## Atualização Completa (Userscript + Addon)

### Checklist

- [ ] Editar `userscript/script.user.js` (versão + código)
- [ ] Atualizar `addon/manifest.json` (versão)
- [ ] Copiar `script.user.js` → `reddit_nsfw_unblur-{v}.user.js`
- [ ] Commit + push
- [ ] Tag + push tag
- [ ] Verificar workflow no GitHub Actions

### Fluxo em 5 passos

```
1. Editar script.user.js
        ↓
2. Atualizar manifest.json
        ↓
3. Copiar userscript
        ↓
4. git add . && git commit -m "build: bump version to {v}" && git push
        ↓
5. git tag v{v} && git push origin v{v}
```

### Comandos (copia e cola)

```powershell
# Passo 3: Copiar userscript
Copy-Item "userscript\script.user.js" -Destination "userscript\reddit_nsfw_unblur-5.0.5.user.js"

# Passo 4: Commit e push
git add userscript/ addon/manifest.json
git commit -m "build: bump version to 5.0.5"
git push origin main

# Passo 5: Tag e push tag
git tag v5.0.5
git push origin v5.0.5
```

---

## Versionamento

### Regra

**Sempre sincronizar** userscript e addon com a mesma versão.

| Arquivo | Campo | Exemplo |
|---------|-------|---------|
| `userscript/script.user.js` | `@version` | `5.0.5` |
| `addon/manifest.json` | `version` | `5.0.5` |

### Número da versão

Seguir semântica:
- **Major** (X.0.0): Mudanças grandes, breaking changes
- **Minor** (0.X.0): Novas features, compatível
- **Patch** (0.0.X): Bugs fixes, melhorias menores

---

## Fluxo CI/CD

### Trigger

Tag push `v*` ativa `.github/workflows/release.yml`

### Pipeline

```
Tag v* push
    ↓
Checkout code
    ↓
Setup Node.js 20
    ↓
Install web-ext
    ↓
Lint extension (validação)
    ↓
web-ext sign --channel listed
    ↓
├── Publica na AMO
└── Gera .xpi assinado em web-ext-artifacts/
    ↓
Create GitHub Release (softprops/action-gh-release)
    ↓
├── Upload .xpi (assinado)
└── Upload .user.js
```

### Artefatos

| Arquivo | Origem | Assinado? |
|---------|--------|-----------|
| `reddit_nsfw_unblur-{v}.xpi` | web-ext sign | Sim (AMO) |
| `reddit_nsfw_unblur-{v}.user.js` | userscript | N/A |

---

## Troubleshooting

### "Version 5.0.3 already exists"

**Causa:** Versão já existe na AMO.

**Solução:** Bump de versão. Incrementar patch (5.0.3 → 5.0.4).

### GitHub Release sem .xpi

**Causa:** Workflow sem permissão `contents: write`.

**Solução:** Adicionar em `release.yml`:
```yaml
permissions:
  contents: write
```

### AMO sign falhou

**Causa:** Secrets não configurados ou inválidos.

**Solução:** Verificar `AMO_JWT_ISSUER` e `AMO_JWT_SECRET` em Settings → Secrets → Actions.

### Workflow não roda

**Causa:** Tag não existe ou nome incorreto.

**Solução:** Verificar tag com `git tag -l` e confirmar formato `v{X.Y.Z}`.

### Lint erros

**Causa:** Problemas na estrutura da extensão.

**Solução:** Rodar local `web-ext lint -s addon` para ver detalhes.

---

## Referência Rápida

| Ação | Comando |
|------|---------|
| Lint local | `web-ext lint -s addon` |
| Build local | `web-ext build -s addon` |
| Tag | `git tag v{X.Y.Z}` |
| Push tag | `git push origin v{X.Y.Z}` |
| Ver workflows | `gh run list` |
| Ver logs | `gh run view {id} --log` |
| Deletar tag | `git tag -d v{X.Y.Z} && git push origin --delete v{X.Y.Z}` |
