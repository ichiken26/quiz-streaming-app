import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCEPTED_SLIDE_MEDIA_ACCEPT,
  isAcceptedSlideMedia,
  isPdfSlideMedia,
  isUploadableSlideImage,
  resolveSlideMediaMimeType,
} from '../shared/utils/slideMedia.ts'

test('ACCEPTED_SLIDE_MEDIA_ACCEPT includes jpeg, png, and pdf', () => {
  assert.match(ACCEPTED_SLIDE_MEDIA_ACCEPT, /image\/jpeg/)
  assert.match(ACCEPTED_SLIDE_MEDIA_ACCEPT, /image\/png/)
  assert.match(ACCEPTED_SLIDE_MEDIA_ACCEPT, /application\/pdf/)
})

test('resolveSlideMediaMimeType accepts jpeg, png, and pdf', () => {
  assert.equal(resolveSlideMediaMimeType({ name: 'slide.jpg', type: 'image/jpeg' }), 'image/jpeg')
  assert.equal(resolveSlideMediaMimeType({ name: 'slide.png', type: 'image/png' }), 'image/png')
  assert.equal(resolveSlideMediaMimeType({ name: 'deck.pdf', type: 'application/pdf' }), 'application/pdf')
})

test('resolveSlideMediaMimeType falls back to file extension', () => {
  assert.equal(resolveSlideMediaMimeType({ name: 'slide.JPG', type: '' }), 'image/jpeg')
  assert.equal(resolveSlideMediaMimeType({ name: 'slide.pdf', type: '' }), 'application/pdf')
})

test('isAcceptedSlideMedia rejects unsupported files', () => {
  assert.equal(isAcceptedSlideMedia({ name: 'slide.gif', type: 'image/gif' }), false)
  assert.equal(isAcceptedSlideMedia({ name: 'notes.txt', type: 'text/plain' }), false)
})

test('isPdfSlideMedia detects pdf by mime type or extension', () => {
  assert.equal(isPdfSlideMedia({ name: 'deck.pdf', type: 'application/pdf' }), true)
  assert.equal(isPdfSlideMedia({ name: 'deck.pdf', type: '' }), true)
  assert.equal(isPdfSlideMedia({ name: 'slide.png', type: 'image/png' }), false)
})

test('isUploadableSlideImage accepts only jpeg and png', () => {
  assert.equal(isUploadableSlideImage({ name: 'slide.jpg', type: 'image/jpeg' }), true)
  assert.equal(isUploadableSlideImage({ name: 'slide.png', type: 'image/png' }), true)
  assert.equal(isUploadableSlideImage({ name: 'deck.pdf', type: 'application/pdf' }), false)
})
