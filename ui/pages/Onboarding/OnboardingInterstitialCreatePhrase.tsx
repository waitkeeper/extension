import React, { ReactElement, useCallback, useEffect } from "react"
import { generateNewKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"

export default function OnboardingInterstitialCreatePhrase(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const history = useHistory()
  // useAreKeyringsUnlocked 这个hook会判断主机词是否生成
  let areKeyringsUnlocked = useAreKeyringsUnlocked(true)
  console.log(`areKeyringsUnlocked:${areKeyringsUnlocked}`)
  // useCallback React提供的Hook，用于返回一个缓存函数。可以提高性能，减少不必要的重新渲染
  // arg1： 缓存的函数
  // arg2: 依赖项
  const generateThenContinue = useCallback(
    async function generateThenContinue() {
      console.log(`generateThenContinu...`)

      if (areKeyringsUnlocked) {
        await dispatch(generateNewKeyring())
        history.push("/onboarding/save-seed")
      }
    },
    [areKeyringsUnlocked, dispatch, history]
  )
  // Hook
  // 调用时间：1. 组件首次渲染后 2. 依赖项发生变化后调用
  useEffect(() => {
    generateThenContinue()
  }, [generateThenContinue])

  return <></>
}
