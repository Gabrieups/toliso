#!/usr/bin/env node
/**
 * Executa um binário de dependência via `require()` em vez do shim `.cmd`
 * gerado pelo npm no Windows.
 *
 * Por quê: todo shim `.cmd` que o npm cria em `node_modules/.bin` contém a
 * linha `SET dp0=%~dp0` sem aspas. Quando o caminho do projeto tem `&&`
 * (dois "e comercial" seguidos — como em pastas chamadas "&&&&"), o cmd.exe
 * interpreta isso como dois operadores de encadeamento sem nada entre eles e
 * falha com "'&&' was unexpected at this time.". Isso afeta QUALQUER CLI
 * instalada via npm (next, tsc, expo, eas-cli, jest, eslint...), não é bug
 * de uma ferramenta específica.
 *
 * Chamando o pacote com `node` diretamente, sem passar pelo `.cmd`, o
 * problema nunca aparece — é a mesma técnica que resolveu isso durante o
 * desenvolvimento deste projeto (rodar `node .../dist/bin/next` em vez de
 * `next`).
 *
 * Uso: node run-bin.js <pacote/caminho/para/o/bin> [...args da CLI]
 */
const moduleId = process.argv[2]

if (!moduleId) {
  console.error("Uso: node run-bin.js <pacote/caminho/para/o/bin> [...args]")
  process.exit(1)
}

// Remove o nome do módulo do argv, mantendo o formato que qualquer CLI espera:
// [node, "caminho do script", ...args reais]. `require.resolve` já usa como
// base o diretório deste arquivo, então funciona tanto se o pacote estiver
// içado na raiz do monorepo quanto instalado local ao workspace.
process.argv.splice(2, 1)

const resolved = require.resolve(moduleId)
process.argv[1] = resolved

require(resolved)
