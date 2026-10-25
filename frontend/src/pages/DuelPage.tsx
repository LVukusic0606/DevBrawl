import { useCallback, useEffect, useRef, useState } from 'react'
import { getCategories, type CategoryInfo } from '../api/categories'
import { DuelScreen } from '../duel/DuelScreen'
import { useDuel } from '../duel/useDuel'

interface DuelPageProps {
  onBack: () => void
  onManageFriends: () => void
  // A friend to invite as soon as the arena is connected, e.g. from the Friends page
  inviteFriendId?: string
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

function DuelPage({ onBack, onManageFriends, inviteFriendId }: DuelPageProps) {
  // One connection for the whole Brawl page; it stops when the page unmounts
  const duel = useDuel()
  const { view, inviteFriend } = duel
  const categoryName = useCategoryNames()

  // Only once: after the invite the page is in the arena like any other visit
  const invited = useRef(false)
  useEffect(() => {
    if (!inviteFriendId || invited.current || view.phase !== 'lobby') return
    invited.current = true
    inviteFriend(inviteFriendId)
  }, [inviteFriendId, inviteFriend, view.phase])

  return (
    <DuelScreen
      view={view}
      reconnecting={duel.reconnecting}
      incoming={duel.incoming}
      categoryName={categoryName}
      onBack={onBack}
      onFindDuel={duel.joinQueue}
      onCancelQueue={duel.leaveQueue}
      onInviteFriend={inviteFriend}
      onAcceptInvite={duel.acceptInvite}
      onDismissInvite={duel.dismissInvite}
      onManageFriends={onManageFriends}
      onSubmit={duel.submitAnswer}
      onPlayAgain={duel.backToLobby}
      onRetry={duel.retry}
    />
  )
}

export default DuelPage
