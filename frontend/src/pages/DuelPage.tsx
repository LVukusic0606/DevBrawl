import { useCallback, useEffect, useState } from 'react'
import { getCategories, type CategoryInfo } from '../api/categories'
import { DuelScreen } from '../duel/DuelScreen'
import { useDuel } from '../duel/useDuel'

interface DuelPageProps {
  onBack: () => void
}

function useCategoryNames() {
  const [categories, setCategories] = useState<CategoryInfo[]>([])

  useEffect(() => {
    let cancelled = false
    getCategories()
      .then((items) => {
        if (!cancelled) setCategories(items)
      })
      .catch(() => {
        // Names are only labels; the duel works without them
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useCallback(
    (id: number) => categories.find((category) => category.id === id)?.name ?? `Category ${id}`,
    [categories],
  )
}

function DuelPage({ onBack }: DuelPageProps) {
  // One connection for the whole Brawl page; it stops when the page unmounts
  const { view, reconnecting, joinQueue, leaveQueue, submitAnswer, backToLobby, retry } = useDuel()
  const categoryName = useCategoryNames()

  return (
    <DuelScreen
      view={view}
      reconnecting={reconnecting}
      categoryName={categoryName}
      onBack={onBack}
      onFindDuel={joinQueue}
      onCancelQueue={leaveQueue}
      onSubmit={submitAnswer}
      onPlayAgain={backToLobby}
      onRetry={retry}
    />
  )
}

export default DuelPage
