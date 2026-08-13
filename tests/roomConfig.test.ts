import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidRoomIdentifier } from '../shared/constants/quiz.ts'
import {
  adminRoomPath,
  participantRoomPath,
  publicRoomApiPath,
} from '../shared/utils/roomRoutes.ts'

test('room identifiers share one validation rule', () => {
  assert.equal(isValidRoomIdentifier('creator_name-01'), true)
  assert.equal(isValidRoomIdentifier('creator/name'), false)
  assert.equal(isValidRoomIdentifier(''), false)
})

test('room paths encode author and room identifiers consistently', () => {
  assert.equal(participantRoomPath('creator name', 'room/1'), '/room/creator%20name/room%2F1')
  assert.equal(adminRoomPath('creator name', 'room/1'), '/admin/room/creator%20name/room%2F1')
  assert.equal(publicRoomApiPath('creator name', 'room/1'), '/api/rooms/creator%20name/room%2F1')
})
