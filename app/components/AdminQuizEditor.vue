<script setup lang="ts">
import { ref } from 'vue'
import { QUIZ_EDITOR_LIMITS } from '#shared/constants/quiz'
import type { Choice, Question, QuestionType, Slide } from '#shared/types/quiz'
import { getCorrectChoiceIds } from '#shared/utils/quizScoring'

defineProps<{
  slide: Slide
  question: Question
  questionLabel: string
}>()

defineEmits<{
  chooseImage: []
  removeImage: []
  dropImage: [files?: FileList]
  chooseAudio: []
  removeAudio: []
  previewAudio: []
  updateType: [type: QuestionType]
  updateText: [text: string]
  updateChoice: [choice: Choice, text: string]
  focusChoice: [choiceId: string]
  blurChoice: [choice: Choice]
  setCorrect: [choiceId: string, checked: boolean]
  removeChoice: [choiceId: string]
  addChoice: []
  updateTimeLimit: [seconds: number]
}>()

const previewAudioRef = ref<HTMLAudioElement>()
</script>

<template>
  <div class="quiz-content">
    <div class="quiz-content__heading">
      <strong>{{ questionLabel }}</strong>
      <select
        :value="question.type"
        @change="$emit('updateType', ($event.target as HTMLSelectElement).value as QuestionType)"
      >
        <option value="single">単一選択</option>
        <option value="multiple">複数選択</option>
      </select>
    </div>
    <div
      class="quiz-image-editor"
      @dragover.prevent
      @drop.prevent.stop="$emit('dropImage', $event.dataTransfer?.files)"
    >
      <img v-if="slide.imageUrl" :src="slide.imageUrl" :alt="`${slide.title}のクイズ画像`">
      <div v-else class="quiz-image-editor__empty">
        <strong>クイズ画像</strong>
        <span>画像をドロップ、またはファイルを選択</span>
      </div>
      <div class="quiz-image-editor__actions">
        <button class="button button--secondary" type="button" @click="$emit('chooseImage')">
          {{ slide.imageUrl ? '画像を差し替える' : '画像を選択する' }}
        </button>
        <button v-if="slide.imageUrl" class="button button--danger" type="button" @click="$emit('removeImage')">
          画像を削除
        </button>
      </div>
    </div>
    <label>問題 <b>必須</b>
      <textarea
        :value="question.text"
        rows="2"
        @input="$emit('updateText', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>
    <fieldset class="choice-editor">
      <legend>選択肢と解答 <b>必須</b></legend>
      <div v-for="choice in question.choices" :key="choice.id" class="choice-editor__row">
        <input
          :type="question.type === 'single' ? 'radio' : 'checkbox'"
          :name="`answer-${question.id}`"
          :checked="getCorrectChoiceIds(question).includes(choice.id)"
          :aria-label="`${choice.label}を正解に設定`"
          @change="$emit('setCorrect', choice.id, ($event.target as HTMLInputElement).checked)"
        >
        <span>{{ choice.label }}</span>
        <input
          :value="choice.text"
          :placeholder="`選択肢 ${choice.label}`"
          :aria-label="`選択肢 ${choice.label}`"
          @focus="$emit('focusChoice', choice.id)"
          @blur="$emit('blurChoice', choice)"
          @input="$emit('updateChoice', choice, ($event.target as HTMLInputElement).value)"
        >
        <button
          class="choice-editor__delete"
          type="button"
          :disabled="question.choices.length <= QUIZ_EDITOR_LIMITS.minChoices"
          :aria-label="`選択肢 ${choice.label}を削除`"
          :title="question.choices.length <= QUIZ_EDITOR_LIMITS.minChoices ? '選択肢は2件以上必要です' : `選択肢 ${choice.label}を削除`"
          @click="$emit('removeChoice', choice.id)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
          </svg>
        </button>
      </div>
      <button
        class="button button--secondary"
        type="button"
        :disabled="question.choices.length >= QUIZ_EDITOR_LIMITS.maxChoices"
        @click="$emit('addChoice')"
      >選択肢を追加（最大{{ QUIZ_EDITOR_LIMITS.maxChoices }}件）</button>
    </fieldset>
    <label class="time-limit">制限時間 <b>必須</b>
      <span>
        <input
          :value="question.timeLimitSeconds"
          type="number"
          min="1"
          @input="$emit('updateTimeLimit', Number(($event.target as HTMLInputElement).value))"
        > 秒
      </span>
    </label>
    <div class="quiz-audio-editor">
      <label>音声</label>
      <div class="quiz-audio-editor__body">
        <button class="button button--secondary" type="button" @click="$emit('chooseAudio')">
          ファイルを選択
        </button>
        <template v-if="question.audio">
          <p class="quiz-audio-editor__name">{{ question.audio.name }}</p>
          <audio
            ref="previewAudioRef"
            :src="question.audio.url"
            preload="metadata"
            class="visually-hidden"
          />
          <div class="quiz-audio-editor__actions">
            <button
              class="button button--secondary"
              type="button"
              @click="previewAudioRef?.paused ? previewAudioRef?.play() : previewAudioRef?.pause()"
            >
              ▶ プレビュー
            </button>
            <button class="button button--danger" type="button" @click="$emit('removeAudio')">
              削除
            </button>
          </div>
        </template>
        <p v-else class="quiz-audio-editor__empty">MP3（最大20MB）を設定できます</p>
      </div>
    </div>
  </div>
</template>
