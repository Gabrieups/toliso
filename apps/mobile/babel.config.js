module.exports = (api) => {
  api.cache(true)
  return {
    // O babel-preset-expo ja cobre o expo-router e a nova arquitetura.
    // Nao ha plugin do Reanimated aqui porque o app nao usa Reanimated:
    // as animacoes sao feitas com a API `Animated` do proprio React Native.
    presets: [["babel-preset-expo", { jsxImportSource: "react" }]],
  }
}
