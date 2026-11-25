<template>
  <desktop-wrapper>
    <app-header class="z-10">
      <template v-slot:menu>
        <app-nav-pills :items="navItems" aria-label="主要頁面" />
        <div class="flex gap-3">
          <app-icon-button
            class="text-nav-active"
            :label="themeToggleLabel"
            :glyph="currentTheme"
            @click="onThemeToggle"
          />
          <app-user-menu />
        </div>
      </template>
    </app-header>
    <main>
      <slot />
    </main>
    <footer class="p-4"></footer>
  </desktop-wrapper>
</template>

<script setup lang="ts">
const {
  navItems,
  currentTheme,
  themeToggleLabel,
  onThemeToggle,
} = useLayoutMenuState();
</script>

<style scoped>
@reference "~/assets/css/main.css";
</style>