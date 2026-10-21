<template>
  <header>
    <slot name="header">
      <slot name="logo">
        <a href="/"><img src="../assets/logo.webp" width="120px" /></a>
      </slot>
      <div>神奇計算機 <(ΦωΦ)> 喵 喵 喵幫你算</div>
      <div>神機喵算 Meowww</div>
    </slot>
    <slot name="menu">
      <app-menu />
    </slot>
  </header>
</template>