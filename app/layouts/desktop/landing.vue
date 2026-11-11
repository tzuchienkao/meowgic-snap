<template>
  <desktop-wrapper>
    <app-header>
      <template v-slot:menu>
        <app-button label="登入"></app-button>
      </template>
    </app-header>
    <main>
      <slot />
    </main>
  </desktop-wrapper>
</template>

<style scoped>
.app-button:hover {
  --button-bg-color: var(--color-peach);

  background-color: var(--button-bg-color);
}
</style>