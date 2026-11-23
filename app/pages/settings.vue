<template>
  <div class="page-settings flex flex-col gap-5">
    <div class="page-settings__header">
      <h1 class="text-ink text-2xl">設定</h1>
      <p class="text-muted text-sm mt-1">這裡改的設定都會幫你記住，下次登入還在喵</p>
    </div>
    <div class="page-settings__body">
      <app-cat-ear-card>
        <div class="flex flex-col gap-4">
          <h2 class="text-ink text-lg">個人資料</h2>
          <app-input
            label="個人名稱"
            :model-value="userName.value"
            :invalid="userName.hasError"
            :hint="userName.errorMessage"
            :count="`${userName.value.length} / ${userName.maxCounter}`"
            @update:model-value="onUserNameUpdate"
            @blur="onUserNameBlur"
          />
          <app-input label="登入信箱" :model-value="userEmail" readonly />
        </div>
      </app-cat-ear-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

const { user, updateUserName } = useAuth()

const userEmail = ref(user.value?.email || '')

const userName = reactive({
  value: user.value?.display_name || '',
  hasError: false,
  errorMessage: '',
  maxCounter: 5
})

const onUserNameUpdate = (value: string) => {
  userName.value = value
  userName.hasError = value.length > userName.maxCounter
  userName.errorMessage = userName.hasError ? `最多 ${userName.maxCounter} 個字` : ''
}

const onUserNameBlur = () => {
  if (!userName.hasError && userName.value !== user.value?.display_name) {
    updateUserName(userName.value)
  }
}
</script>