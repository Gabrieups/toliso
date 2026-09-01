import { isRunningInExpoGo } from "expo"

/**
 * `experimentalBlurMethod="dimezisBlurView"` (blur real no Android) é
 * experimental e pode derrubar o app sem log nenhum dentro do Expo Go — cai
 * pra "none" só aí. Em development build / produção o blur real continua
 * ativo normalmente.
 */
export const IS_EXPO_GO = isRunningInExpoGo()
