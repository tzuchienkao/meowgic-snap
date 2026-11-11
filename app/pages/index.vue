<template>
  <h1 class="text-3xl font-bold underline">index.vue</h1>
  <input v-model="email" type="email" placeholder="請輸入你的 Email" />
  <button @click="handleLogin" :disabled="loading">
    {{ loading ? '寄送中...' : '寄送魔法連結' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const loading = ref(false)

const { data } = await useFetch('/api/data')

const { data: posts } = await useAsyncData(
  '_posts',
  () => $fetch('/api/posts'),
  {
    transform: (res) => {
      return res.posts
    }
  }
)

const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase

const handleLogin = async () => {
  loading.value = true

  const { error } = await $supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: `${window.location.origin}/settings`,
    },
  })

  loading.value = false
}
</script>