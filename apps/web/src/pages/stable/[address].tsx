import {
  AutoRow,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Message,
  MessageText,
  Text,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from '@pancakeswap/widgets-internal'
import { AppHeader } from 'components/App'
import { useMemo } from 'react'

import { useRouter } from 'next/router'
import { useStableSwapPairs } from 'state/swap/useStableSwapPairs'
import { styled } from 'styled-components'
import { CHAIN_IDS } from 'utils/wagmi'
import Page from 'views/Page'

import { useTranslation } from '@pancakeswap/localization'
import { CurrencyAmount } from '@pancakeswap/sdk'
import { LightGreyCard } from 'components/Card'
import { CurrencyLogo } from 'components/Logo'
import { usePoolTokenPercentage, useTotalUSDValue } from 'components/PositionCard'
import { useInfoStableSwapContract } from 'hooks/useContract'
import useTotalSupply from 'hooks/useTotalSupply'
import { useSingleCallResult } from 'state/multicall/hooks'
import { useLPApr } from 'state/swap/useLPApr'
import currencyId from 'utils/currencyId'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'
import { formatAmount } from 'utils/formatInfoNumbers'
import { useAccount } from 'wagmi'
import { Protocol } from '@pancakeswap/farms'
import { useAccountPositionDetailByPool } from 'state/farmsV4/state/accountPositions/hooks'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { usePoolInfo } from 'state/farmsV4/state/extendPools/hooks'

export const BodyWrapper = styled(Card)`
  border-radius: 24px;
  max-width: 858px;
  width: 100%;
  z-index: 1;
`

export default function StablePoolPage() {
  const {
    t,
    currentLanguage: { locale },
  } = useTranslation()

  const router = useRouter()

  const { address: account } = useAccount()

  const { address: poolAddress } = router.query

  const lpTokens = useStableSwapPairs()

  const { chainId } = useActiveChainId()

  const selectedLp = useMemo(
    () => lpTokens.find(({ liquidityToken }) => liquidityToken.address === poolAddress),
    [lpTokens, poolAddress],
  )

  const poolInfo = usePoolInfo({ poolAddress: selectedLp ? selectedLp?.stableSwapAddress : null, chainId })

  const stableSwapInfoContract = useInfoStableSwapContract(selectedLp?.infoStableSwapAddress)

  const { data: positionDetails } = useAccountPositionDetailByPool<Protocol.STABLE>(
    poolInfo?.chainId ?? chainId,
    account,
    poolInfo ?? undefined,
  )

  const isPoolStaked = useMemo(() => {
    return positionDetails?.farmingDeposited0.greaterThan(0) || positionDetails?.farmingDeposited1.greaterThan(0)
  }, [positionDetails])

  const { result } = useSingleCallResult({
    contract: stableSwapInfoContract,
    functionName: 'balances',
    // @ts-ignore
    args: useMemo(() => [selectedLp?.stableSwapAddress] as const, [selectedLp?.stableSwapAddress]),
  })

  const reserves = useMemo(() => result || [0n, 0n], [result])

  const stableLp = useMemo(() => {
    return selectedLp
      ? [selectedLp].map((lpToken) => ({
          ...lpToken,
          tokenAmounts: [],
          reserve0: CurrencyAmount.fromRawAmount(lpToken?.token0, reserves[0]),
          reserve1: CurrencyAmount.fromRawAmount(lpToken?.token1, reserves[1]),
          getLiquidityValue: () => CurrencyAmount.fromRawAmount(lpToken?.token0, '0'),
        }))[0]
      : null
  }, [reserves, selectedLp])

  const totalLiquidityUSD = useTotalUSDValue({
    currency0: selectedLp?.token0,
    currency1: selectedLp?.token1,
    token0Deposited: stableLp?.reserve0,
    token1Deposited: stableLp?.reserve1,
  })

  const userPoolBalance = useMemo(() => {
    return isPoolStaked
      ? positionDetails?.nativeBalance.add(positionDetails?.farmingBalance)
      : positionDetails?.nativeBalance
  }, [positionDetails, isPoolStaked])

  const [token0Deposited, token1Deposited] = useMemo(() => {
    return [
      isPoolStaked
        ? positionDetails?.nativeDeposited0.add(positionDetails?.farmingDeposited0)
        : positionDetails?.nativeDeposited0,
      isPoolStaked
        ? positionDetails?.nativeDeposited1.add(positionDetails?.farmingDeposited1)
        : positionDetails?.nativeDeposited1,
    ]
  }, [positionDetails, isPoolStaked])

  const totalStakedUSDValue = useTotalUSDValue({
    currency0: selectedLp?.token0,
    currency1: selectedLp?.token1,
    token0Deposited: isPoolStaked ? positionDetails?.farmingDeposited0 : undefined,
    token1Deposited: isPoolStaked ? positionDetails?.farmingDeposited1 : undefined,
  })

  const totalUSDValue = useTotalUSDValue({
    currency0: selectedLp?.token0,
    currency1: selectedLp?.token1,
    token0Deposited,
    token1Deposited,
  })

  const totalPoolTokens = useTotalSupply(selectedLp?.liquidityToken)

  const poolTokenPercentage = usePoolTokenPercentage({ totalPoolTokens, userPoolBalance })

  const { isMobile } = useMatchBreakpoints()

  const poolData = useLPApr('stable', selectedLp)

  if (!selectedLp) return null

  const currencyIdA = currencyId(selectedLp.token0)
  const currencyIdB = currencyId(selectedLp.token1)

  return (
    <Page>
      <BodyWrapper>
        <AppHeader
          title={`${stableLp?.token0?.symbol}-${stableLp?.token1?.symbol} LP`}
          backTo="/liquidity/pools"
          noConfig
          buttons={
            !isMobile && (
              <>
                <NextLinkFromReactRouter to={`/stable/add/${currencyIdA}/${currencyIdB}`}>
                  <Button width="100%">{t('Add')}</Button>
                </NextLinkFromReactRouter>
                <NextLinkFromReactRouter to={`/stable/remove/${currencyIdA}/${currencyIdB}`}>
                  <Button ml="16px" variant="secondary" width="100%">
                    {t('Remove')}
                  </Button>
                </NextLinkFromReactRouter>
              </>
            )
          }
        />
        <CardBody>
          {isMobile && (
            <>
              <NextLinkFromReactRouter to={`/stable/add/${currencyIdA}/${currencyIdB}`}>
                <Button mb="8px" width="100%">
                  {t('Add')}
                </Button>
              </NextLinkFromReactRouter>
              <NextLinkFromReactRouter to={`/stable/remove/${currencyIdA}/${currencyIdB}`}>
                <Button mb="8px" variant="secondary" width="100%">
                  {t('Remove')}
                </Button>
              </NextLinkFromReactRouter>
            </>
          )}
          <AutoRow style={{ gap: 4 }}>
            <Flex
              alignItems="center"
              justifyContent="space-between"
              style={{ gap: 4 }}
              width="100%"
              flexWrap={['wrap', 'wrap', 'nowrap']}
            >
              <Box width="100%">
                <Text fontSize="12px" color="secondary" bold textTransform="uppercase">
                  {t('Liquidity')}
                </Text>
                <Text fontSize="24px" fontWeight={600}>
                  $
                  {totalUSDValue
                    ? totalUSDValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-'}
                </Text>
                <LightGreyCard mr="4px">
                  <AutoRow justifyContent="space-between" mb="8px">
                    <Flex>
                      <CurrencyLogo currency={stableLp?.token0} />
                      <Text small color="textSubtle" id="remove-liquidity-tokenb-symbol" ml="4px">
                        {stableLp?.token0?.symbol}
                      </Text>
                    </Flex>
                    <Flex justifyContent="center">
                      <Text mr="4px">{formatCurrencyAmount(token0Deposited, 4, locale)}</Text>
                    </Flex>
                  </AutoRow>
                  <AutoRow justifyContent="space-between" mb="8px">
                    <Flex>
                      <CurrencyLogo currency={stableLp?.token1} />
                      <Text small color="textSubtle" id="remove-liquidity-tokenb-symbol" ml="4px">
                        {stableLp?.token1?.symbol}
                      </Text>
                    </Flex>
                    <Flex justifyContent="center">
                      <Text mr="4px">{formatCurrencyAmount(token1Deposited, 4, locale)}</Text>
                    </Flex>
                  </AutoRow>
                </LightGreyCard>
              </Box>
              <Box width="100%">
                <Text fontSize="12px" color="secondary" bold textTransform="uppercase">
                  {t('Pool reserves')}
                </Text>
                <Text fontSize="24px" fontWeight={600}>
                  $
                  {totalLiquidityUSD
                    ? totalLiquidityUSD.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-'}
                </Text>
                <LightGreyCard mr="4px">
                  <AutoRow justifyContent="space-between" mb="8px">
                    <Flex>
                      <CurrencyLogo currency={stableLp?.token0} />
                      <Text small color="textSubtle" id="remove-liquidity-tokenb-symbol" ml="4px">
                        {stableLp?.token0?.symbol}
                      </Text>
                    </Flex>
                    <Flex justifyContent="center">
                      <Text mr="4px">{formatCurrencyAmount(stableLp?.reserve0, 4, locale)}</Text>
                    </Flex>
                  </AutoRow>
                  <AutoRow justifyContent="space-between" mb="8px">
                    <Flex>
                      <CurrencyLogo currency={stableLp?.token1} />
                      <Text small color="textSubtle" id="remove-liquidity-tokenb-symbol" ml="4px">
                        {stableLp?.token1?.symbol}
                      </Text>
                    </Flex>
                    <Flex justifyContent="center">
                      <Text mr="4px">{formatCurrencyAmount(stableLp?.reserve1, 4, locale)}</Text>
                    </Flex>
                  </AutoRow>
                </LightGreyCard>
              </Box>
            </Flex>
            <Flex flexDirection="column" style={{ gap: 4 }}>
              {isPoolStaked && (
                <Message variant="primary">
                  <MessageText>
                    {t('$%amount% of your liquidity is currently staking in farm.', {
                      amount: totalStakedUSDValue
                        ? totalStakedUSDValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '-',
                    })}
                  </MessageText>
                </Message>
              )}
              {poolData && (
                <Text ml="4px">
                  {t('LP reward APR')}: {formatAmount(poolData.lpApr7d)}%
                </Text>
              )}
              <Text color="textSubtle" ml="4px">
                {t('Your share in pool')}: {poolTokenPercentage ? `${poolTokenPercentage.toFixed(8)}%` : '-'}
              </Text>
            </Flex>
          </AutoRow>
        </CardBody>
      </BodyWrapper>
    </Page>
  )
}

StablePoolPage.chains = CHAIN_IDS
