import { useVeCakeContract } from 'hooks/useContract'
import { useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { useLockCakeData } from 'state/vecake/hooks'
import dayjs from 'dayjs'
import { useSetAtom } from 'jotai'
import { approveAndLockStatusAtom, cakeLockTxHashAtom, ApproveAndLockStatus } from 'state/vecake/atoms'
import { usePublicNodeWaitForTransaction } from 'hooks/usePublicNodeWaitForTransaction'
import { useVeCakeUserInfo } from '../useVeCakeUserInfo'

export const useWriteIncreaseLockWeeksCallback = () => {
  const veCakeContract = useVeCakeContract()
  const { end } = useVeCakeUserInfo().data ?? {}
  const { address: account } = useAccount()
  const { cakeLockWeeks } = useLockCakeData()
  const setStatus = useSetAtom(approveAndLockStatusAtom)
  const setTxHash = useSetAtom(cakeLockTxHashAtom)
  const { data: walletClient } = useWalletClient()
  const { waitForTransaction } = usePublicNodeWaitForTransaction()

  const increaseLockWeeks = useCallback(async () => {
    const startTime = end ? dayjs.unix(Number(end)) : dayjs()

    const { request } = await veCakeContract.simulate.increaseUnlockTime(
      [BigInt(startTime.add(Number(cakeLockWeeks), 'week').unix())],
      {
        account: account!,
        chain: veCakeContract.chain,
      },
    )

    setStatus(ApproveAndLockStatus.LOCK_CAKE)

    const hash = await walletClient?.writeContract(request)
    setTxHash(hash)
    setStatus(ApproveAndLockStatus.LOCK_CAKE_PENDING)
    if (hash) {
      await waitForTransaction({ hash })
    }
    setStatus(ApproveAndLockStatus.CONFIRMED)
  }, [
    end,
    veCakeContract.simulate,
    veCakeContract.chain,
    cakeLockWeeks,
    account,
    setStatus,
    walletClient,
    setTxHash,
    waitForTransaction,
  ])

  return increaseLockWeeks
}