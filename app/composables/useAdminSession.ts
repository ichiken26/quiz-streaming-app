type AdminSession = { email: string; systemAdmin: boolean }

export function useAdminSession() {
  const session = ref<AdminSession>()
  const status = ref<'idle' | 'pending' | 'authorized' | 'forbidden' | 'error'>('idle')

  async function verify() {
    status.value = 'pending'
    try {
      session.value = await $fetch<AdminSession>('/api/admin/session')
      status.value = 'authorized'
    }
    catch (error: unknown) {
      const code = (error as { statusCode?: number; status?: number }).statusCode
        ?? (error as { status?: number }).status
      status.value = code === 403 ? 'forbidden' : 'error'
    }
  }

  onMounted(verify)
  return { session: readonly(session), status: readonly(status), verify }
}
