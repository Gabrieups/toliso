import { LogBox } from "react-native"

/**
 * O Expo Go (SDK 53+) não suporta push remoto no Android e sinaliza isso com
 * um `console.error` assim que `expo-notifications` é importado — vira uma
 * tela cheia no LogBox, mas é só um aviso: lembretes locais continuam
 * funcionando, e o push remoto de qualquer forma não funcionaria no Expo Go
 * mesmo sem o aviso.
 *
 * Precisa ser importado a partir de `index.js`, antes de `expo-router/entry` —
 * o Expo Router carrega toda rota (inclusive `app/(tabs)/settings.tsx`, que
 * puxa `expo-notifications`) ao montar a árvore de rotas, o que acontece antes
 * de `app/_layout.tsx` rodar.
 */
LogBox.ignoreLogs([/Android Push notifications \(remote notifications\)/])
