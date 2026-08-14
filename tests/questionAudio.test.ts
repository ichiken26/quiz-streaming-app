import assert from 'node:assert/strict'
import test from 'node:test'
import {
  QUESTION_AUDIO_ACCEPT,
  QUESTION_AUDIO_MAX_BYTES,
  audioObjectNameFromUrl,
  formatAudioDuration,
  isAcceptedQuestionAudio,
  isQuestionAudioWithinSizeLimit,
  resolveQuestionAudioMimeType,
} from '../shared/utils/questionAudio.ts'
import { sanitizePublicRoomConfig } from '../shared/utils/publicRoomConfig.ts'

test('QUESTION_AUDIO_ACCEPT includes mp3 mime and extension', () => {
  assert.match(QUESTION_AUDIO_ACCEPT, /audio\/mpeg/)
  assert.match(QUESTION_AUDIO_ACCEPT, /\.mp3/)
})

test('resolveQuestionAudioMimeType accepts mp3', () => {
  assert.equal(resolveQuestionAudioMimeType({ name: 'question.mp3', type: 'audio/mpeg' }), 'audio/mpeg')
  assert.equal(resolveQuestionAudioMimeType({ name: 'question.MP3', type: '' }), 'audio/mpeg')
})

test('isAcceptedQuestionAudio rejects non-mp3 files', () => {
  assert.equal(isAcceptedQuestionAudio({ name: 'question.wav', type: 'audio/wav' }), false)
})

test('isQuestionAudioWithinSizeLimit enforces 20MB', () => {
  assert.equal(isQuestionAudioWithinSizeLimit(QUESTION_AUDIO_MAX_BYTES), true)
  assert.equal(isQuestionAudioWithinSizeLimit(QUESTION_AUDIO_MAX_BYTES + 1), false)
  assert.equal(isQuestionAudioWithinSizeLimit(0), false)
})

test('audioObjectNameFromUrl extracts object name from admin audio url', () => {
  assert.equal(
    audioObjectNameFromUrl('event-room-01', '/api/admin/audio/event-room-01/abc.mp3'),
    'abc.mp3',
  )
  assert.equal(audioObjectNameFromUrl('event-room-01', '/slides/event-room-01/a.png'), undefined)
})

test('formatAudioDuration renders mm:ss', () => {
  assert.equal(formatAudioDuration(14), '00:14')
  assert.equal(formatAudioDuration(92), '01:32')
})

test('sanitizePublicRoomConfig removes question audio metadata', () => {
  const sanitized = sanitizePublicRoomConfig({
    author: 'creator',
    roomId: 'room-01',
    title: 'Demo',
    winnerLastRank: 1,
    initialSlideIndex: 0,
    slides: [],
    questions: [{
      id: 'q1',
      type: 'single',
      text: 'Question',
      audio: { url: '/api/admin/audio/room-01/a.mp3', name: 'a.mp3' },
      choices: [],
      timeLimitSeconds: 30,
    }],
  })

  assert.equal(sanitized.questions[0]?.audio, undefined)
})
