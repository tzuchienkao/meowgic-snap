<template>
  <header class="app-header flex items-center justify-between gap-3 py-4">
    <slot name="header">
      <app-brand></app-brand>
    </slot>
    <slot name="menu">
    </slot>
  </header>
</template>