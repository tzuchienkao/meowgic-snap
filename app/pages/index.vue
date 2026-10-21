<template>
  <h1>index.vue</h1>
  <div>{{ data ? data : 'No data' }}</div>
</template>

<script setup lang="ts">
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
</script>