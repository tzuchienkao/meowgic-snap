<template>
  <h1>index.vue</h1>
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
      // 1. 先印出 API 真正的回傳值
      console.log('API 真正的資料結構:', res)

      // 2. 假設真正的 key 叫做 posts：
      return res.posts
    }
  }
)
console.log('posts', posts.value)

// onMounted(async () => {
  // 測試 $supabase
  const nuxtApp = useNuxtApp()
  
  const $supabase = nuxtApp.$supabase

  const handleLogin = async () => {
    loading.value = true

    const { error } = await $supabase.auth.signInWithOtp({
        email: email.value,
        options: {
        // 點擊信件連結後，要跳轉回我們的驗證處理頁面
        emailRedirectTo: `${window.location.origin}/settings`,
        },
    })

    loading.value = false
  }
// })
</script>