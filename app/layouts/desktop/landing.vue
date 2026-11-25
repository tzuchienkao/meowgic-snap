<template>
  <desktop-wrapper>
    <app-header>
      <!-- TODO: 登入功能尚未開放 -->
      <!-- <template v-slot:menu>
        <app-button
          class="login-button"
          variant="surface"
          size="md"
          label="登入"
          @click="openModal"
        >
        </app-button>
      </template> -->
    </app-header>
    <main>
      <slot />
    </main>
    <footer class="p-4"></footer>
    <!-- Guest 偏好設定: tab on the left edge + floating panel (members use the settings page) -->
    <app-preferences-drawer />
    <app-dialog
      :open="isShowModal"
      :title="model.title"
      cat-ears
      closable
      :persistent="model.isStatic"
      @close="onDialogClose"
    >
      <p class="login-dialog__description">{{ model.description }}</p>
      <app-input
        ref="emailInput"
        type="email"
        autocomplete="email"
        :label="email.label"
        :model-value="email.value"
        :placeholder="email.placeholder"
        :invalid="!!email.error"
        :hint="email.error"
        @update:model-value="email.onEmailUpdate"
        @blur="email.onEmailBlur"
      />
      <app-button
        variant="strong"
        full
        :label="loading ? '寄送中...' : '寄送魔法連結'"
        :disabled="loading"
        @click="onMagicLinkClick"
      />
    </app-dialog>
  </desktop-wrapper>
</template>

<script setup lang="ts">
import { validateEmail } from '~/utils/validators';

const {
  isShowModal,
  openModal,
  closeModal
} = useLayoutMenuState();

const nuxtApp = useNuxtApp();
const $supabase = nuxtApp.$supabase;

const loading = ref(false);

const model = reactive({
  title: '登入 / 註冊',
  description: '輸入信箱，喵會寄一封魔法連結給你，點一下就登入，不用記密碼。',
  isStatic: true
});

const emailInput = ref<{ $el: HTMLElement } | null>(null);

const email = reactive({
  label: '信箱',
  value: '',
  placeholder: 'example@mail.com',
  error: '',

  onEmailUpdate(value: string) {
    email.value = value;
    // Once an error is showing, re-check while typing so it clears as soon as the value is valid
    if (email.error) email.error = validateEmail(value);
  },

  // Check on blur only when something was typed (an empty field is reported on submit)
  onEmailBlur() {
    if (email.value.trim()) email.error = validateEmail(email.value);
  }
});

const onDialogClose = () => {
  email.error = '';
  closeModal();
};

const handleLogin = async () => {
  loading.value = true

  try {
    const { error } = await $supabase.auth.signInWithOtp({
      email: email.value.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    loading.value = false
    if (error) {
      throw error
    }
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    loading.value = false
  }
}

const onMagicLinkClick = async () => {
  email.error = validateEmail(email.value);
  if (email.error) {
    emailInput.value?.$el?.querySelector('input')?.focus();
    return;
  }

  try {
    await handleLogin();
    closeModal();
  } catch (error) {
    console.error(error);
  }
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.login-button:hover {
  --button-bg-color: var(--ms-peach);
  background-color: var(--button-bg-color);
}

.login-dialog__description {
  @apply text-center text-body-md text-muted;
}
</style>