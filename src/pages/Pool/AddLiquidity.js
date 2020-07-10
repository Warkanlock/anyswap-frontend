import React, { useReducer, useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createBrowserHistory } from 'history'
import { ethers } from 'ethers'
// import ReactGA from 'react-ga'
import styled from 'styled-components'

import { Button } from '../../theme'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import OversizedPanel from '../../components/OversizedPanel'
import ContextualInfo from '../../components/ContextualInfo'
import { ReactComponent as Plus } from '../../assets/images/plus-blue.svg'
import WarningCard from '../../components/WarningCard'

import { useWeb3React, useExchangeContract } from '../../hooks'
import { brokenTokens, broken777Tokens } from '../../constants'
import { amountFormatter, calculateGasMargin } from '../../utils'
import { useTransactionAdder } from '../../contexts/Transactions'
import { useTokenDetails, INITIAL_TOKENS_CONTEXT } from '../../contexts/Tokens'
import { useAddressBalance, useExchangeReserves } from '../../contexts/Balances'
import { useAddressAllowance } from '../../contexts/Allowances'
import { useWalletModalToggle } from '../../contexts/Application'

import config from '../../config'
import {getWeb3ConTract, getWeb3BaseInfo} from '../../utils/web3/txns'
import EXCHANGE_ABI from '../../constants/abis/exchange'

import HardwareTip from '../../components/HardwareTip'
import AddIcon from '../../assets/images/icon/add.svg'

import { ReactComponent as Dropup } from '../../assets/images/dropup-blue.svg'
import { ReactComponent as Dropdown } from '../../assets/images/dropdown-blue.svg'
import AddTwoBlackIcon from '../../assets/images/icon/add-2-black.svg'
import WeekIcon from '../../assets/images/icon/week.svg'
import MintMlackIcon from '../../assets/images/icon/mint-black.svg'
import FSNLogo from '../../assets/images/FSN.svg'

import TokenLogo from '../../components/TokenLogo'

const INPUT = 0
const OUTPUT = 1

// denominated in bips
const ALLOWED_SLIPPAGE = ethers.utils.bigNumberify(200)

// denominated in seconds
const DEADLINE_FROM_NOW = 60 * 15

// denominated in bips
const GAS_MARGIN = ethers.utils.bigNumberify(1000)

const BlueSpan = styled.span`
font-family: Manrope;
font-size: 12px;
font-weight: bold;
font-stretch: normal;
font-style: normal;
line-height: 1.17;
letter-spacing: normal;
color: #062536;
`

const NewExchangeWarning = styled.div`
  margin-top: 1rem;
  padding: 1rem;

  border: 1px solid rgba($pizazz-orange, 0.4);
  background-color: rgba($pizazz-orange, 0.1);
  border-radius: 1rem;
`

const NewExchangeWarningText = styled.div`
  font-size: 0.8rem;
  line-height: 1rem;
  text-align: center;

  :first-child {
    padding-bottom: 0.3rem;
    font-weight: 500;
  }
`

const LastSummaryTextBox = styled.div`
  width: 100%;
  height: 240px;
  object-fit: contain;
  border-radius: 9px;
  box-shadow: 7px 2px 26px 0 rgba(0, 0, 0, 0.06);
  background-color: #ffffff;
  padding: 25px 40px;
  margin-top: 10px;
`
const LastSummaryText = styled.div`
${({ theme }) => theme.FlexSC}
  font-family: Manrope;
  font-size: 12px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.17;
  letter-spacing: normal;
  color: #062536;
  height: 32px;
  margin-bottom: 10px;
  .icon {
    width: 32px;
    height: 32px;
    padding: 8px;
    object-fit: contain;
    border: solid 0.5px #c0d6ea;
    background-color: #ecf6ff;
    border-radius: 100%;
    margin-right: 10px;
    img {
      height: 100%;
      display:block;
    }
  }
`
const LogoBox = styled.div`
  ${({ theme }) => theme.FlexSC}
  width: 30px;
  height: 30px;
  object-fit: contain;
  background-color: #ffffff;
  border-radius:100%;
  padding: 7px;
  margin: 0 0px 0 8px;
  img {
    height: 100%;
    display:block;
  }
`
const CoinInfoBox  = styled.div`
${({ theme }) => theme.FlexC}
font-family: Manrope;
  font-size: 14px;
  font-weight: 800;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.43;
  letter-spacing: normal;
  color: #062536;
  margin: 0 8px;
`
const LastSummaryText1 = styled.div`
${({ theme }) => theme.FlexSC}
  width: 100%;
  height: 54px;
  object-fit: contain;
  border-radius: 9px;
  border: solid 0.5px #c0d6ea;
  background-color: #ecf6ff;
  padding: 0 20px;
  font-family: Manrope;
  font-size: 12px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.17;
  letter-spacing: normal;
  color: #062536;
  margin-top:20px;
`

const DownArrowBackground = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 7px 2px 26px 0 rgba(0, 0, 0, 0.06);
  background-color: #ffffff;
  margin: 10px auto;
`
const SummaryPanel = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  padding: 1rem 0;
  width: 50%;
`

const ExchangeRateWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  align-items: center;
  color: ${({ theme }) => theme.doveGray};
  font-size: 0.75rem;
  padding: 8px 1rem ;
  height: 28px;
  border-bottom:1px solid #dadada;
  span {
    height: 12px;
    font-family: Manrope;
    font-size: 12px;
    font-weight: 800;
    font-stretch: normal;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-align: right;
    color: #062536;
  }
`

const ExchangeRate = styled.div`
  height: 12px;
  font-family: Manrope;
  font-size: 12px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-align: right;
  color: #062536;
  margin-right: 5px;
`

const Flex = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;

  button {
    max-width: 20rem;
  }
`

const WrappedPlus = ({ isError, highSlippageWarning, ...rest }) => <Plus {...rest} />
const ColoredWrappedPlus = styled(WrappedPlus)`
  width: 0.625rem;
  height: 0.625rem;
  position: relative;
  padding: 0.875rem;
  path {
    stroke: ${({ active, theme }) => (active ? theme.royalBlue : theme.chaliceGray)};
  }
`

const SummaryPanelBox = styled.div`
  ${({ theme }) => theme.FlexBC}
  height: 115px;
  object-fit: contain;
  border-radius: 9px;
  background-color: #ededed;
  margin-top:10px;
  padding: 18px 29px;
`

const TxnsDtilBtn = styled.div`
  ${({ theme }) => theme.FlexC};
  width: 145px;
  height: 34px;
  object-fit: contain;
  border-radius: 6px;
  background-color: #f9fafb;
  font-family: Manrope;
  font-size: 12px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  color: #062536;
  cursor:pointer;
`

// const StyledDropDown = styled(DropDown)`
//   height: 35%;
//   margin-right: 10px;
//   path {
//     stroke: ${({ selected, theme }) => (selected ? theme.textColor : theme.royalBlue)};
//   }
// `

const WrappedDropup = ({ isError, highSlippageWarning, ...rest }) => <Dropup {...rest} />
const ColoredDropup = styled(WrappedDropup)`
margin-right: 10px;
  path {
    stroke: ${({ theme }) => theme.royalBlue};
  }
`

const WrappedDropdown = ({ isError, highSlippageWarning, ...rest }) => <Dropdown {...rest} />
const ColoredDropdown = styled(WrappedDropdown)`
margin-right: 10px;
  path {
    stroke: ${({ theme }) => theme.royalBlue};
  }
`

function calculateSlippageBounds(value) {
  if (value) {
    const offset = value.mul(ALLOWED_SLIPPAGE).div(ethers.utils.bigNumberify(10000))
    const minimum = value.sub(offset)
    const maximum = value.add(offset)
    return {
      minimum: minimum.lt(ethers.constants.Zero) ? ethers.constants.Zero : minimum,
      maximum: maximum.gt(ethers.constants.MaxUint256) ? ethers.constants.MaxUint256 : maximum
    }
  } else {
    return {}
  }
}

function calculateMaxOutputVal(value) {
  if (value) {
    return value.mul(ethers.utils.bigNumberify(10000)).div(ALLOWED_SLIPPAGE.add(ethers.utils.bigNumberify(10000)))
  }
}

function initialAddLiquidityState(state) {
  return {
    inputValue: state.ethAmountURL ? state.ethAmountURL : '',
    outputValue: state.tokenAmountURL && !state.ethAmountURL ? state.tokenAmountURL : '',
    lastEditedField: state.tokenAmountURL && state.ethAmountURL === '' ? OUTPUT : INPUT,
    outputCurrency: state.tokenURL ? state.tokenURL : '0xC20b5E92E1ce63Af6FE537491f75C19016ea5fb4'
  }
}

function addLiquidityStateReducer(state, action) {
  switch (action.type) {
    case 'SELECT_CURRENCY': {
      return {
        ...state,
        outputCurrency: action.payload
      }
    }
    case 'UPDATE_VALUE': {
      const { inputValue, outputValue } = state
      const { field, value } = action.payload
      return {
        ...state,
        inputValue: field === INPUT ? value : inputValue,
        outputValue: field === OUTPUT ? value : outputValue,
        lastEditedField: field
      }
    }
    case 'UPDATE_DEPENDENT_VALUE': {
      const { inputValue, outputValue } = state
      const { field, value } = action.payload
      return {
        ...state,
        inputValue: field === INPUT ? value : inputValue,
        outputValue: field === OUTPUT ? value : outputValue
      }
    }
    default: {
      return initialAddLiquidityState()
    }
  }
}

function getExchangeRate(inputValue, inputDecimals, outputValue, outputDecimals, invert = false) {
  try {
    if (
      inputValue &&
      (inputDecimals || inputDecimals === 0) &&
      outputValue &&
      (outputDecimals || outputDecimals === 0)
    ) {
      const factor = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))

      if (invert) {
        return inputValue
          .mul(factor)
          .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
          .div(outputValue)
      } else {
        return outputValue
          .mul(factor)
          .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
          .div(inputValue)
      }
    }
  } catch {}
}

function getMarketRate(reserveETH, reserveToken, decimals, invert = false) {
  return getExchangeRate(reserveETH, 18, reserveToken, decimals, invert)
}

export default function AddLiquidity({ params }) {
  const { t } = useTranslation()
  let { library, account, active, chainId } = useWeb3React()
  let walletType = sessionStorage.getItem('walletType')
  let HDPath = sessionStorage.getItem('HDPath')
  // account = config.supportWallet.includes(walletType) ? sessionStorage.getItem('account') : account
  const urlAddedTokens = {}
  if (params.token) {
    urlAddedTokens[params.token] = true
  }

  // clear url of query
  useEffect(() => {
    const history = createBrowserHistory()
    history.push(window.location.pathname + '')
  }, [])

  const [addLiquidityState, dispatchAddLiquidityState] = useReducer(
    addLiquidityStateReducer,
    { ethAmountURL: params.ethAmount, tokenAmountURL: params.tokenAmount, tokenURL: params.token },
    initialAddLiquidityState
  )
  const { inputValue, outputValue, lastEditedField, outputCurrency } = addLiquidityState
  const inputCurrency = 'FSN'

  const [inputValueParsed, setInputValueParsed] = useState()
  const [outputValueParsed, setOutputValueParsed] = useState()
  const [inputError, setInputError] = useState()
  const [outputError, setOutputError] = useState()
  const [zeroDecimalError, setZeroDecimalError] = useState()

  const [brokenTokenWarning, setBrokenTokenWarning] = useState()
  const [broken777Warning, setBroken777Warning] = useState()

  const { symbol, decimals, exchangeAddress } = useTokenDetails(outputCurrency)
  const exchangeContract = useExchangeContract(exchangeAddress)

  const [totalPoolTokens, setTotalPoolTokens] = useState()
  const fetchPoolTokens = useCallback(() => {
    if (exchangeContract) {
      exchangeContract.totalSupply().then(totalSupply => {
        setTotalPoolTokens(totalSupply)
      })
    }
  }, [exchangeContract])
  useEffect(() => {
    fetchPoolTokens()
    library.on('block', fetchPoolTokens)

    return () => {
      library.removeListener('block', fetchPoolTokens)
    }
  }, [fetchPoolTokens, library])

  const poolTokenBalance = useAddressBalance(account, exchangeAddress)
  const exchangeETHBalance = useAddressBalance(exchangeAddress, 'FSN')
  const exchangeTokenBalance = useAddressBalance(exchangeAddress, outputCurrency)

  const { reserveETH, reserveToken } = useExchangeReserves(outputCurrency)
  const isNewExchange = !!(reserveETH && reserveToken && reserveETH.isZero() && reserveToken.isZero())

  // 18 decimals
  const poolTokenPercentage =
    poolTokenBalance && totalPoolTokens && isNewExchange === false && !totalPoolTokens.isZero()
      ? poolTokenBalance.mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))).div(totalPoolTokens)
      : undefined
  const ethShare =
    exchangeETHBalance && poolTokenPercentage
      ? exchangeETHBalance
          .mul(poolTokenPercentage)
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
      : undefined
  const tokenShare =
    exchangeTokenBalance && poolTokenPercentage
      ? exchangeTokenBalance
          .mul(poolTokenPercentage)
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
      : undefined

  const liquidityMinted = isNewExchange
    ? inputValueParsed
    : totalPoolTokens && inputValueParsed && exchangeETHBalance && !exchangeETHBalance.isZero()
    ? totalPoolTokens.mul(inputValueParsed).div(exchangeETHBalance)
    : undefined

  // user balances
  const inputBalance = useAddressBalance(account, inputCurrency)
  const outputBalance = useAddressBalance(account, outputCurrency)

  const ethPerLiquidityToken =
    exchangeETHBalance && totalPoolTokens && isNewExchange === false && !totalPoolTokens.isZero()
      ? exchangeETHBalance.mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))).div(totalPoolTokens)
      : undefined
  const tokenPerLiquidityToken =
    exchangeTokenBalance && totalPoolTokens && isNewExchange === false && !totalPoolTokens.isZero()
      ? exchangeTokenBalance.mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))).div(totalPoolTokens)
      : undefined

  const outputValueMax = outputValueParsed && calculateSlippageBounds(outputValueParsed).maximum
  const liquidityTokensMin = liquidityMinted && calculateSlippageBounds(liquidityMinted).minimum

  const marketRate = useMemo(() => {
    return getMarketRate(reserveETH, reserveToken, decimals)
  }, [reserveETH, reserveToken, decimals])
  const marketRateInverted = useMemo(() => {
    return getMarketRate(reserveETH, reserveToken, decimals, true)
  }, [reserveETH, reserveToken, decimals])

  function renderTransactionDetails() {
    const b = text => <BlueSpan>{text}</BlueSpan>

    if (isNewExchange) {
      return (
        <LastSummaryTextBox>
          <LastSummaryText>
            {t('youAreAdding')} {b(`${inputValue} FSN`)} {t('and')} {b(`${outputValue} ${symbol}`)} {t('intoPool')}
          </LastSummaryText>
          <LastSummaryText>
            {t('youAreSettingExRate')}{' '}
            {b(
              `1 FSN = ${amountFormatter(
                getMarketRate(inputValueParsed, outputValueParsed, decimals),
                18,
                4,
                false
              )} ${symbol}`
            )}
            .
          </LastSummaryText>
          <LastSummaryText>
            {t('youWillMint')} {b(`${inputValue}`)} {t('liquidityTokens')}
          </LastSummaryText>
          <LastSummaryText>{t('totalSupplyIs0')}</LastSummaryText>
        </LastSummaryTextBox>
      )
    } else {
      return (
        <LastSummaryTextBox>
          <LastSummaryText>
          <div className='icon'>
            <img src={AddTwoBlackIcon} />
          </div>
            {t('youAreAdding')} {b(`${amountFormatter(inputValueParsed, 18, 4)} FSN`)} {t('and')} {'at most'}{' '}
            {b(`${amountFormatter(outputValueMax, decimals, Math.min(decimals, 4))} ${symbol}`)} {t('intoPool')}
          </LastSummaryText>
          <LastSummaryText>
          <div className='icon'>
            <img src={MintMlackIcon} />
          </div>
            {t('youWillMint')} {b(amountFormatter(liquidityMinted, 18, 4))} {t('liquidityTokens')}
          </LastSummaryText>
          <LastSummaryText>
          <div className='icon'>
            <img src={WeekIcon} />
          </div>
            {t('totalSupplyIs')} {b(amountFormatter(totalPoolTokens, 18, 4))}
          </LastSummaryText>
          <LastSummaryText1>
            {t('tokenWorth')}
            <LogoBox><img src={FSNLogo}/></LogoBox>
            <CoinInfoBox>{amountFormatter(ethPerLiquidityToken, 18, 4) + ' '} FSN </CoinInfoBox>{t('and')}{' '}
            <LogoBox><TokenLogo  address={outputCurrency} size={'18px'} ></TokenLogo></LogoBox>
            <CoinInfoBox>{amountFormatter(tokenPerLiquidityToken, decimals, Math.min(decimals, 4)) + ' '} {symbol}</CoinInfoBox>
          </LastSummaryText1>
        </LastSummaryTextBox>
      )
    }
  }

  // function renderSummary() {
  //   let contextualInfo = ''
  //   let isError = false
  //   if (brokenTokenWarning) {
  //     contextualInfo = t('brokenToken')
  //     isError = true
  //   } else if (broken777Warning) {
  //     contextualInfo = t('broken777')
  //     isError = true
  //   } else if (zeroDecimalError) {
  //     contextualInfo = zeroDecimalError
  //   } else if (inputError || outputError) {
  //     contextualInfo = inputError || outputError
  //     isError = true
  //   } else if (!inputCurrency || !outputCurrency) {
  //     contextualInfo = t('selectTokenCont')
  //   } else if (!inputValue) {
  //     contextualInfo = t('enterValueCont')
  //   } else if (!account) {
  //     contextualInfo = t('noWallet')
  //     isError = true
  //   }

  //   return (
  //     <ContextualInfo
  //       openDetailsText={t('transactionDetails')}
  //       closeDetailsText={t('hideDetails')}
  //       contextualInfo={contextualInfo}
  //       isError={isError}
  //       renderTransactionDetails={renderTransactionDetails}
  //     />
  //   )
  // }
  const [isViewTxnsDtil, setIsViewTxnsDtil] = useState(false)
  function txnsInfoTaggle () {
    let contextualInfo = ''
    let isError = false
    if (brokenTokenWarning) {
      contextualInfo = t('brokenToken')
      isError = true
    } else if (broken777Warning) {
      contextualInfo = t('broken777')
      isError = true
    } else if (zeroDecimalError) {
      contextualInfo = zeroDecimalError
    } else if (inputError || outputError) {
      contextualInfo = inputError || outputError
      isError = true
    } else if (!inputCurrency || !outputCurrency) {
      contextualInfo = t('selectTokenCont')
    } else if (!inputValue) {
      contextualInfo = t('enterValueCont')
    } else if (!account) {
      contextualInfo = t('noWallet')
      isError = true
    }

    return (
      <TxnsDtilBtn>
        {contextualInfo ? contextualInfo : (
          <>
            {
              isViewTxnsDtil ? (
                <div onClick={() => {
                  setIsViewTxnsDtil(!isViewTxnsDtil)
                }}>
                  <ColoredDropup></ColoredDropup>
                  {t('hideDetails')}
                </div>
              ) : (
                <div onClick={() => {
                  setIsViewTxnsDtil(!isViewTxnsDtil)
                }}>
                  <ColoredDropdown></ColoredDropdown>
                  {t('transactionDetails')}
                </div>
              )
            }
            {/* <StyledDropDown></StyledDropDown>
            {t('transactionDetails')} */}
          </>
        )}
      </TxnsDtilBtn>
    )
  }

  const addTransaction = useTransactionAdder()

  async function onAddLiquidity() {
    // take FSN amount, multiplied by FSN rate and 2 for total tx size
    let ethTransactionSize = (inputValueParsed / 1e18) * 2

    const deadline = Math.ceil(Date.now() / 1000) + DEADLINE_FROM_NOW

    if (config.supportWallet.includes(walletType)) {
      setIsHardwareError(false)
      setIsHardwareTip(true)
      setHardwareTxnsInfo('')
      let web3Contract = getWeb3ConTract(EXCHANGE_ABI, exchangeAddress)
      let data = web3Contract.addLiquidity.getData(
        isNewExchange ? ethers.constants.Zero.toHexString() : liquidityTokensMin.toHexString(),
        isNewExchange ? outputValueParsed.toHexString() : outputValueMax.toHexString(),
        deadline)
      getWeb3BaseInfo(exchangeAddress, exchangeAddress, data, account, inputValueParsed.toHexString()).then(res => {
        console.log(res)
        if (res.msg === 'Success') {
          addTransaction(res.info)
          setIsHardwareTip(false)
        } else {
          setIsHardwareError(true)
        }
        // addTransaction(response)
      })
      return
    }
    if (isNewExchange) {
      console.log('isNewExchange new')
      console.log(ethers.constants.Zero.toString())
      console.log(outputValueParsed.toString())
    } else {
      console.log('isNewExchange old')
      console.log(liquidityTokensMin.toString())
      console.log(outputValueMax.toString())
    }
    console.log(deadline)
    const estimatedGasLimit = await exchangeContract.estimate.addLiquidity(
      isNewExchange ? ethers.constants.Zero : liquidityTokensMin,
      isNewExchange ? outputValueParsed : outputValueMax,
      deadline,
      {
        value: inputValueParsed
      }
    )

    const gasLimit = calculateGasMargin(estimatedGasLimit, GAS_MARGIN)

    exchangeContract
      .addLiquidity(
        isNewExchange ? ethers.constants.Zero : liquidityTokensMin,
        isNewExchange ? outputValueParsed : outputValueMax,
        deadline,
        {
          value: inputValueParsed,
          gasLimit
        }
      )
      .then(response => {
        addTransaction(response)
      }).catch(err => {
        console.log(err)
      })
  }

  function formatBalance(value) {
    return `Balance: ${value}`
  }

  useEffect(() => {
    setBrokenTokenWarning(false)
    for (let i = 0; i < brokenTokens.length; i++) {
      if (brokenTokens[i].toLowerCase() === outputCurrency.toLowerCase()) {
        setBrokenTokenWarning(true)
      }
    }
  }, [outputCurrency])

  useEffect(() => {
    setBroken777Warning(false)
    for (let i = 0; i < broken777Tokens.length; i++) {
      if (broken777Tokens[i].toLowerCase() === outputCurrency.toLowerCase()) {
        setBroken777Warning(true)
      }
    }
  }, [outputCurrency])

  useEffect(() => {
    if (isNewExchange) {
      setZeroDecimalError()
      if (inputValue) {
        const parsedInputValue = ethers.utils.parseUnits(inputValue, 18)
        setInputValueParsed(parsedInputValue)
      }
      if (outputValue) {
        try {
          const parsedOutputValue = ethers.utils.parseUnits(outputValue, decimals)
          setOutputValueParsed(parsedOutputValue)
        } catch {
          setZeroDecimalError('Invalid input. For 0 decimal tokens only supply whole number token amounts.')
        }
      }
    }
  }, [decimals, inputValue, isNewExchange, outputValue])

  // parse input value
  useEffect(() => {
    if (
      isNewExchange === false &&
      inputValue &&
      marketRate &&
      lastEditedField === INPUT &&
      (decimals || decimals === 0)
    ) {
      try {
        const parsedValue = ethers.utils.parseUnits(inputValue, 18)

        if (parsedValue.lte(ethers.constants.Zero) || parsedValue.gte(ethers.constants.MaxUint256)) {
          throw Error()
        }

        setInputValueParsed(parsedValue)

        const currencyAmount = marketRate
          .mul(parsedValue)
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18 - decimals)))

        setOutputValueParsed(currencyAmount)
        dispatchAddLiquidityState({
          type: 'UPDATE_DEPENDENT_VALUE',
          payload: { field: OUTPUT, value: amountFormatter(currencyAmount, decimals, Math.min(decimals, 4), false) }
        })

        return () => {
          setOutputError()
          setInputValueParsed()
          setOutputValueParsed()
          dispatchAddLiquidityState({
            type: 'UPDATE_DEPENDENT_VALUE',
            payload: { field: OUTPUT, value: '' }
          })
        }
      } catch {
        setOutputError(t('inputNotValid'))
      }
    }
  }, [inputValue, isNewExchange, lastEditedField, marketRate, decimals, t])

  // parse output value
  useEffect(() => {
    if (
      isNewExchange === false &&
      outputValue &&
      marketRateInverted &&
      lastEditedField === OUTPUT &&
      (decimals || decimals === 0)
    ) {
      try {
        const parsedValue = ethers.utils.parseUnits(outputValue, decimals)

        if (parsedValue.lte(ethers.constants.Zero) || parsedValue.gte(ethers.constants.MaxUint256)) {
          throw Error()
        }

        setOutputValueParsed(parsedValue)

        const currencyAmount = marketRateInverted
          .mul(parsedValue)
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(decimals)))

        setInputValueParsed(currencyAmount)
        dispatchAddLiquidityState({
          type: 'UPDATE_DEPENDENT_VALUE',
          payload: { field: INPUT, value: amountFormatter(currencyAmount, 18, 4, false) }
        })

        return () => {
          setInputError()
          setOutputValueParsed()
          setInputValueParsed()
          dispatchAddLiquidityState({
            type: 'UPDATE_DEPENDENT_VALUE',
            payload: { field: INPUT, value: '' }
          })
        }
      } catch {
        setInputError(t('inputNotValid'))
      }
    }
  }, [outputValue, isNewExchange, lastEditedField, marketRateInverted, decimals, t])

  // input validation
  useEffect(() => {
    if (inputValueParsed && inputBalance) {
      if (inputValueParsed.gt(inputBalance)) {
        setInputError(t('insufficientBalance'))
      } else {
        setInputError(null)
      }
    }

    if (outputValueMax && outputBalance) {
      if (outputValueMax.gt(outputBalance)) {
        setOutputError(t('insufficientBalance'))
      } else {
        setOutputError(null)
      }
    }
  }, [inputValueParsed, inputBalance, outputValueMax, outputBalance, t])

  const allowance = useAddressAllowance(account, outputCurrency, exchangeAddress)

  const [showUnlock, setShowUnlock] = useState(false)

  const [isHardwareTip, setIsHardwareTip] = useState(false)
  const [isHardwareError, setIsHardwareError] = useState(false)
  const [hardwareTxnsInfo, setHardwareTxnsInfo] = useState('')

  useEffect(() => {
    if (outputValueParsed && allowance) {
      if (allowance.lt(outputValueParsed)) {
        setOutputError(t('unlockTokenCont'))
        setShowUnlock(true)
      }
      return () => {
        setOutputError()
        setShowUnlock(false)
      }
    }
  }, [outputValueParsed, allowance, t])

  const isActive = active && account
  const isValid =
    (inputError === null || outputError === null) && !zeroDecimalError && !showUnlock && !brokenTokenWarning

  const newOutputDetected =
    outputCurrency !== 'FSN' && outputCurrency && !INITIAL_TOKENS_CONTEXT[chainId].hasOwnProperty(outputCurrency)

  const [showOutputWarning, setShowOutputWarning] = useState(false)

  const toggleWalletModal = useWalletModalToggle()

  useEffect(() => {
    if (newOutputDetected) {
      setShowOutputWarning(true)
    } else {
      setShowOutputWarning(false)
    }
  }, [newOutputDetected, setShowOutputWarning])
  return (
    <>
    <HardwareTip
        HardwareTipOpen={isHardwareTip}
        closeHardwareTip={() => {
          setIsHardwareTip(false)
        }}
        error={isHardwareError}
        txnsInfo={hardwareTxnsInfo}
      ></HardwareTip>
      {showOutputWarning && (
        <WarningCard
          onDismiss={() => {
            setShowOutputWarning(false)
          }}
          urlAddedTokens={urlAddedTokens}
          currency={outputCurrency}
        />
      )}
      <CurrencyInputPanel
        title={t('deposit')}
        extraText={inputBalance && formatBalance(amountFormatter(inputBalance, 18, 4))}
        onValueChange={inputValue => {
          dispatchAddLiquidityState({ type: 'UPDATE_VALUE', payload: { value: inputValue, field: INPUT } })
        }}
        extraTextClickHander={() => {
          if (inputBalance) {
            const valueToSet = inputBalance.sub(ethers.utils.parseEther('.1'))
            if (valueToSet.gt(ethers.constants.Zero)) {
              dispatchAddLiquidityState({
                type: 'UPDATE_VALUE',
                payload: { value: amountFormatter(valueToSet, 18, 18, false), field: INPUT }
              })
            }
          }
        }}
        selectedTokenAddress="FSN"
        value={inputValue}
        errorMessage={inputError}
        disableTokenSelect
      />
      <OversizedPanel>
        <DownArrowBackground>
          {/* <ColoredWrappedPlus active={isActive} alt="plus" /> */}
          <img src={AddIcon} />
        </DownArrowBackground>
      </OversizedPanel>
      <CurrencyInputPanel
        title={t('deposit')}
        description={isNewExchange ? '' : outputValue ? `(${t('estimated')})` : ''}
        extraText={
          outputBalance && decimals && formatBalance(amountFormatter(outputBalance, decimals, Math.min(decimals, 4)))
        }
        urlAddedTokens={urlAddedTokens}
        selectedTokenAddress={outputCurrency}
        onCurrencySelected={outputCurrency => {
          dispatchAddLiquidityState({ type: 'SELECT_CURRENCY', payload: outputCurrency })
        }}
        onValueChange={outputValue => {
          dispatchAddLiquidityState({ type: 'UPDATE_VALUE', payload: { value: outputValue, field: OUTPUT } })
        }}
        extraTextClickHander={() => {
          if (outputBalance) {
            dispatchAddLiquidityState({
              type: 'UPDATE_VALUE',
              payload: {
                value: amountFormatter(calculateMaxOutputVal(outputBalance), decimals, decimals, false),
                field: OUTPUT
              }
            })
          }
        }}
        value={outputValue}
        showUnlock={showUnlock}
        errorMessage={outputError}
      />
      <SummaryPanelBox>
        <>
          {txnsInfoTaggle()}
        </>
        <SummaryPanel>
          <ExchangeRateWrapper>
            <ExchangeRate>{t('exchangeRate')}</ExchangeRate>
            <span>{marketRate ? `1 FSN = ${amountFormatter(marketRate, 18, 4)} ${symbol}` : ' - '}</span>
          </ExchangeRateWrapper>
          <ExchangeRateWrapper>
            <ExchangeRate>{t('currentPoolSize')}</ExchangeRate>
            <span>
              {exchangeETHBalance && exchangeTokenBalance
                ? `${amountFormatter(exchangeETHBalance, 18, 4)} FSN + ${amountFormatter(
                    exchangeTokenBalance,
                    decimals,
                    Math.min(4, decimals)
                  )} ${symbol}`
                : ' - '}
            </span>
          </ExchangeRateWrapper>
          <ExchangeRateWrapper>
            <ExchangeRate>
              {t('yourPoolShare')} ({exchangeETHBalance && amountFormatter(poolTokenPercentage, 16, 2)}%)
            </ExchangeRate>
            <span>
              {ethShare && tokenShare
                ? `${amountFormatter(ethShare, 18, 4)} FSN + ${amountFormatter(
                    tokenShare,
                    decimals,
                    Math.min(4, decimals)
                  )} ${symbol}`
                : ' - '}
            </span>
          </ExchangeRateWrapper>
        </SummaryPanel>

      </SummaryPanelBox>
      {isViewTxnsDtil ? renderTransactionDetails() : ''}
      {/* <OversizedPanel hideBottom>
        <SummaryPanel>
          <ExchangeRateWrapper>
            <ExchangeRate>{t('exchangeRate')}</ExchangeRate>
            <span>{marketRate ? `1 FSN = ${amountFormatter(marketRate, 18, 4)} ${symbol}` : ' - '}</span>
          </ExchangeRateWrapper>
          <ExchangeRateWrapper>
            <ExchangeRate>{t('currentPoolSize')}</ExchangeRate>
            <span>
              {exchangeETHBalance && exchangeTokenBalance
                ? `${amountFormatter(exchangeETHBalance, 18, 4)} FSN + ${amountFormatter(
                    exchangeTokenBalance,
                    decimals,
                    Math.min(4, decimals)
                  )} ${symbol}`
                : ' - '}
            </span>
          </ExchangeRateWrapper>
          <ExchangeRateWrapper>
            <ExchangeRate>
              {t('yourPoolShare')} ({exchangeETHBalance && amountFormatter(poolTokenPercentage, 16, 2)}%)
            </ExchangeRate>
            <span>
              {ethShare && tokenShare
                ? `${amountFormatter(ethShare, 18, 4)} FSN + ${amountFormatter(
                    tokenShare,
                    decimals,
                    Math.min(4, decimals)
                  )} ${symbol}`
                : ' - '}
            </span>
          </ExchangeRateWrapper>
        </SummaryPanel>
      </OversizedPanel>
      {renderSummary()} */}
      {isNewExchange ? (
        <NewExchangeWarning>
          <NewExchangeWarningText>
            <span role="img" aria-label="first-liquidity">
              🚰
            </span>{' '}
            {t('firstLiquidity')}
          </NewExchangeWarningText>
          <NewExchangeWarningText style={{ marginTop: '10px' }}>
            {t('initialExchangeRate', { symbol })}
          </NewExchangeWarningText>
        </NewExchangeWarning>
      ) : null}
      {isNewExchange && (
        <NewExchangeWarningText style={{ textAlign: 'center', marginTop: '10px' }}>
          {t('initialWarning')}
        </NewExchangeWarningText>
      )}
      <Flex>
        {/* <Button disabled={!isValid} onClick={onAddLiquidity}>
          {t('addLiquidity')}
        </Button> */}
        {
          account ? (
            <>
              <Button disabled={!isValid} onClick={onAddLiquidity}>
                {t('addLiquidity')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={toggleWalletModal}>
                {t('connectToWallet')}
              </Button>
            </>
          )
        }
      </Flex>
    </>
  )
}
