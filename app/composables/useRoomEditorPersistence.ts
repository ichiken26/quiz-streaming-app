import { computed, onBeforeUnmount, ref, toRaw, watch, type ComputedRef, type Ref } from 'vue'
import { QUIZ_EDITOR_LIMITS, isValidRoomIdentifier } from '#shared/constants/quiz'
import type { RoomChange, RoomConfig } from '#shared/types/quiz'
import { createEmptyRoomConfig, normalizeRoomConfig } from '#shared/utils/roomConfig'
import { adminRoomApiPath } from '#shared/utils/roomRoutes'
import { apiErrorMessage } from '~/utils/apiError'

type PersistenceOptions = {
  room: RoomConfig
  changes: Ref<RoomChange[]>
  canSave: ComputedRef<boolean>
  afterLoad?: () => Promise<void>
  afterSave?: () => Promise<void>
}

const changeKey = (change: RoomChange) => `${change.field}:${change.contentId ?? ''}:${change.changedAt}`

export function useRoomEditorPersistence(options: PersistenceOptions) {
  const route = useRoute()
  const router = useRouter()
  const queryRoomId = computed(() => String(route.query.roomId ?? route.query.q ?? '').trim())
  const queryAuthor = computed(() => String(route.query.author ?? '').trim())
  const originalRoomId = ref('')
  const loadedRoomId = ref('')
  const loadingRoomId = ref('')
  const savedOnce = ref(false)
  const initialized = ref(false)
  const saving = ref(false)
  const saveMessage = ref('')
  const saveError = ref('')
  const roomLoadError = ref('')
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let messageTimer: ReturnType<typeof setTimeout> | undefined

  const saveState = computed<'unsaved' | 'saving' | 'saved'>(() => {
    if (saving.value) return 'saving'
    if (!savedOnce.value || options.changes.value.length) return 'unsaved'
    return 'saved'
  })
  const saveStateLabel = computed(() => ({
    unsaved: '未保存',
    saving: '保存中',
    saved: '保存済',
  })[saveState.value])

  function showMessage(message: string) {
    saveMessage.value = message
    clearTimeout(messageTimer)
    messageTimer = setTimeout(() => {
      saveMessage.value = ''
    }, QUIZ_EDITOR_LIMITS.saveMessageDurationMs)
  }

  async function persist(create = false) {
    if (!options.canSave.value || saving.value) return
    saving.value = true
    saveError.value = ''

    try {
      const submittedChanges = [...options.changes.value]
      const submittedRoom = normalizeRoomConfig(toRaw(options.room))
      const endpoint = adminRoomApiPath(create ? undefined : originalRoomId.value)
      let lastError: unknown

      for (let attempt = 0; attempt < QUIZ_EDITOR_LIMITS.saveAttempts; attempt += 1) {
        try {
          const result = await $fetch<{ roomId: string }>(endpoint, {
            method: create ? 'POST' : 'PATCH',
            body: { room: submittedRoom, changes: submittedChanges },
          })
          originalRoomId.value = result.roomId
          loadedRoomId.value = result.roomId
          savedOnce.value = true
          const submitted = new Set(submittedChanges.map(changeKey))
          options.changes.value = options.changes.value.filter(change => !submitted.has(changeKey(change)))
          showMessage('ルームを保存しました')
          await router.replace({ path: '/admin/edit', query: { q: result.roomId } })
          await options.afterSave?.()
          scheduleAutosave()
          return
        }
        catch (error) {
          lastError = error
        }
      }

      saveError.value = apiErrorMessage(lastError, '保存に失敗しました。しばらくしてもう一度保存してください')
    }
    catch (error) {
      saveError.value = apiErrorMessage(error, '保存処理に失敗しました')
    }
    finally {
      saving.value = false
    }
  }

  function scheduleAutosave() {
    if (!options.changes.value.length) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void persist(false), QUIZ_EDITOR_LIMITS.autosaveDelayMs)
  }

  function saveNow() {
    clearTimeout(saveTimer)
    void persist(!savedOnce.value)
  }

  async function loadRoom(roomId: string) {
    if (!roomId) {
      Object.assign(options.room, createEmptyRoomConfig())
      if (isValidRoomIdentifier(queryAuthor.value)) options.room.author = queryAuthor.value
      options.changes.value = []
      originalRoomId.value = ''
      loadedRoomId.value = ''
      savedOnce.value = false
      initialized.value = true
      return
    }
    if (loadedRoomId.value === roomId || loadingRoomId.value === roomId) return

    originalRoomId.value = roomId
    loadingRoomId.value = roomId
    roomLoadError.value = ''
    initialized.value = false
    try {
      const loaded = await $fetch<RoomConfig>(adminRoomApiPath(roomId))
      if (queryRoomId.value !== roomId) return
      Object.assign(options.room, loaded)
      options.changes.value = []
      loadedRoomId.value = roomId
      savedOnce.value = true
      initialized.value = true
      await nextTick()
      await options.afterLoad?.()
    }
    catch (error) {
      if (queryRoomId.value !== roomId) return
      roomLoadError.value = apiErrorMessage(error, 'ルームを読み込めませんでした')
      initialized.value = true
    }
    finally {
      if (loadingRoomId.value === roomId) loadingRoomId.value = ''
    }
  }

  function start(authStatus: Readonly<Ref<string>>) {
    watch(
      [authStatus, queryRoomId, queryAuthor],
      ([status, roomId]) => {
        if (status === 'authorized') void loadRoom(roomId)
      },
      { immediate: true },
    )
    watch(options.room, () => {
      if (initialized.value && savedOnce.value) scheduleAutosave()
    }, { deep: true })
  }

  onBeforeUnmount(() => {
    clearTimeout(saveTimer)
    clearTimeout(messageTimer)
  })

  return {
    queryRoomId,
    loadedRoomId,
    savedOnce,
    initialized,
    saving,
    saveMessage,
    saveError,
    roomLoadError,
    saveState,
    saveStateLabel,
    showMessage,
    saveNow,
    start,
  }
}
