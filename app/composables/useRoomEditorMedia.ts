import { ref } from 'vue'
import { isValidRoomIdentifier } from '#shared/constants/quiz'
import type { RoomConfig, Slide } from '#shared/types/quiz'
import {
  isAcceptedSlideMedia,
  isPdfSlideMedia,
  isUploadableSlideImage,
  resolveSlideMediaMimeType,
} from '#shared/utils/slideMedia'
import { createId } from '#shared/utils/roomConfig'
import { adminImageApiPath } from '#shared/utils/roomRoutes'
import { apiErrorMessage } from '~/utils/apiError'
import { pdfToPngFiles } from '~/utils/pdf'

type MediaOptions = {
  insertSlide: (slide: Slide, afterSlideId?: string) => void
  markChanged: (field: string, contentId?: string) => void
  closeContextMenu: () => void
  setError: (message: string) => void
}

export function useRoomEditorMedia(room: RoomConfig, options: MediaOptions) {
  const fileInput = ref<HTMLInputElement>()
  const replaceSlideId = ref('')
  const insertAfterSlideId = ref('')
  const convertingPdf = ref(false)

  function partitionAcceptedFiles(files: File[]) {
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of files) {
      if (isAcceptedSlideMedia(file)) accepted.push(file)
      else rejected.push(file.name)
    }
    return { accepted, rejected }
  }

  async function expandFiles(files: File[]) {
    const targets: File[] = []
    convertingPdf.value = files.some(isPdfSlideMedia)
    try {
      for (const file of files) {
        if (isPdfSlideMedia(file)) {
          targets.push(...await pdfToPngFiles(file))
          continue
        }
        targets.push(file)
      }
      return targets
    }
    finally {
      convertingPdf.value = false
    }
  }

  async function uploadImage(file: File) {
    const contentType = resolveSlideMediaMimeType(file) ?? file.type
    return $fetch<{ imageUrl: string }>(adminImageApiPath(room.roomId), {
      method: 'POST',
      body: file,
      headers: { 'content-type': contentType },
    })
  }

  async function uploadFiles(files: FileList | File[], afterSlideId = insertAfterSlideId.value) {
    if (!isValidRoomIdentifier(room.roomId)) {
      options.setError('画像を追加する前に、有効なルームIDを入力してください')
      return
    }

    const sourceFiles = replaceSlideId.value ? Array.from(files).slice(0, 1) : Array.from(files)
    const { accepted, rejected } = partitionAcceptedFiles(sourceFiles)
    if (rejected.length) {
      options.setError(`JPEG、PNG、PDFのみアップロードできます: ${rejected.join(', ')}`)
      return
    }
    if (!accepted.length) return

    let targets: File[]
    try {
      targets = await expandFiles(accepted)
    }
    catch (error) {
      options.setError(error instanceof Error ? error.message : 'PDFをPNGへ変換できませんでした')
      return
    }

    let insertionAnchor = afterSlideId
    for (const file of targets) {
      if (!isUploadableSlideImage(file)) continue
      try {
        const result = await uploadImage(file)
        const replacing = room.slides.find(slide => slide.id === replaceSlideId.value)
        if (replacing) {
          const previousImageUrl = replacing.imageUrl
          replacing.imageUrl = result.imageUrl
          if (replacing.type !== 'question') replacing.title = file.name.replace(/\.[^.]+$/, '')
          options.markChanged('image:update', replacing.id)
          if (previousImageUrl !== result.imageUrl) await deleteStoredImage(previousImageUrl)
        }
        else {
          const addedSlide: Slide = {
            id: createId('content'),
            type: 'slide',
            title: file.name.replace(/\.[^.]+$/, ''),
            imageUrl: result.imageUrl,
          }
          options.insertSlide(addedSlide, insertionAnchor)
          insertionAnchor = addedSlide.id
          options.markChanged('image:add', result.imageUrl)
        }
      }
      catch (error) {
        options.setError(apiErrorMessage(error, '画像を追加できませんでした'))
      }
    }
    resetInputs()
  }

  function resetInputs() {
    replaceSlideId.value = ''
    insertAfterSlideId.value = ''
    if (fileInput.value) fileInput.value.value = ''
  }

  function chooseAddition(afterSlideId = '') {
    replaceSlideId.value = ''
    insertAfterSlideId.value = afterSlideId
    fileInput.value?.click()
    options.closeContextMenu()
  }

  function chooseReplacement(slideId: string) {
    insertAfterSlideId.value = ''
    replaceSlideId.value = slideId
    fileInput.value?.click()
  }

  function dropReplacement(slideId: string, files?: FileList) {
    if (!files?.length) return
    replaceSlideId.value = slideId
    void uploadFiles(files)
  }

  async function deleteStoredImage(imageUrl: string) {
    const prefix = `/slides/${room.roomId}/`
    if (!imageUrl.startsWith(prefix)) return
    const objectName = imageUrl.slice(prefix.length)
    await $fetch(adminImageApiPath(room.roomId, objectName), { method: 'DELETE' }).catch(() => undefined)
  }

  async function removeImage(slide: Slide) {
    if (!slide.imageUrl) return
    await deleteStoredImage(slide.imageUrl)
    slide.imageUrl = ''
    options.markChanged('image:delete', slide.id)
  }

  function onDropFiles(event: DragEvent) {
    if (event.dataTransfer?.files.length) void uploadFiles(event.dataTransfer.files, '')
  }

  return {
    fileInput,
    convertingPdf,
    uploadFiles,
    chooseAddition,
    chooseReplacement,
    dropReplacement,
    deleteStoredImage,
    removeImage,
    onDropFiles,
  }
}
