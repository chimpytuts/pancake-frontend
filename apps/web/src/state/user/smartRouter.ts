import { userSingleHopAtom } from '@pancakeswap/utils/user'
import { atom, useAtom, useAtomValue } from 'jotai'
import atomWithStorageWithErrorCatch from 'utils/atomWithStorageWithErrorCatch'

const userUseStableSwapAtom = atomWithStorageWithErrorCatch<boolean>('pcs:useStableSwap', false)
const userUseV2SwapAtom = atomWithStorageWithErrorCatch<boolean>('pcs:useV2Swap', false)
const userUseV3SwapAtom = atomWithStorageWithErrorCatch<boolean>('pcs:useV3Swap', true)
const userUserSplitRouteAtom = atomWithStorageWithErrorCatch<boolean>('pcs:useSplitRouting', false)
const userUseMMLinkedPoolAtom = atomWithStorageWithErrorCatch<boolean>('pcs:useMMlinkedPool', false)

export function useUserStableSwapEnable() {
  return useAtom(userUseStableSwapAtom)
}

export function useUserV2SwapEnable() {
  return useAtom(userUseV2SwapAtom)
}

export function useUserV3SwapEnable() {
  return useAtom(userUseV3SwapAtom)
}

export function useUserSplitRouteEnable() {
  return useAtom(userUserSplitRouteAtom)
}

export function useMMLinkedPoolByDefault() {
  return useAtom(userUseMMLinkedPoolAtom)
}

const derivedOnlyOneAMMSourceEnabledAtom = atom((get) => {
  return [get(userUseStableSwapAtom), get(userUseV2SwapAtom), get(userUseV3SwapAtom)].filter(Boolean).length === 1
})

export function useOnlyOneAMMSourceEnabled() {
  return useAtomValue(derivedOnlyOneAMMSourceEnabledAtom)
}

const derivedRoutingSettingChangedAtom = atom(
  (get) => {
    return [
      get(userUseStableSwapAtom),
      get(userUseV2SwapAtom),
      get(userUseV3SwapAtom),
      get(userUserSplitRouteAtom),
      get(userUseMMLinkedPoolAtom),
      !get(userSingleHopAtom),
    ].some((x) => x === false)
  },
  (_, set) => {
    set(userUseStableSwapAtom, true)
    set(userUseV2SwapAtom, true)
    set(userUseV3SwapAtom, true)
    set(userUserSplitRouteAtom, true)
    set(userUseMMLinkedPoolAtom, true)
    set(userSingleHopAtom, false)
  },
)

export function useRoutingSettingChanged() {
  return useAtom(derivedRoutingSettingChangedAtom)
}
