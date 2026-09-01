// O `getDefaultConfig` do Expo ja detecta a raiz do workspace sozinho a partir
// do SDK 53: ele configura `watchFolders` e `nodeModulesPaths` para encontrar
// `packages/core`, que e consumido como TypeScript (sem passo de build).
const { getDefaultConfig } = require("expo/metro-config")

module.exports = getDefaultConfig(__dirname)
