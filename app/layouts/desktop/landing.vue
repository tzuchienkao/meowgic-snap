<template>
  <desktop-wrapper>
    <app-header>
      <template v-slot:menu>
        <app-button
          label="登入"
          @click="openModal"
        >
        </app-button>
      </template>
    </app-header>
    <main>
      <slot />
    </main>
    <modal-cat-card
      v-if="isShowModal"
      :title="model.title"
      :description="model.description"
      :is-static="model.isStatic"
      @close-click="closeModal"
    >
      <template #modal-body>
        <div class="text-muted text-sm flex flex-col gap-1">
          <label>{{ email.label }}</label>
          <app-input
            type="email"
            :model-value="email.value"
            :placeholder="email.placeholder"
            @update:model-value="email.onEmailUpdate"
          />
        </div>
      </template>
      <template #modal-footer>
        <app-button
          class="app-button__submit"
          :label="loading ? '寄送中...' : '寄送魔法連結'"
          :disabled="loading"
          @click="onMagicLinkClick"
        >
        </app-button>
      </template>
    </modal-cat-card>
  </desktop-wrapper>
</template>

<script setup lang="ts">
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

const email = reactive({
  label: '信箱',
  value: '',
  placeholder: 'example@mail.com',
  
  onEmailUpdate(value: string) {
    email.value = value;
  }
});

const handleLogin = async () => {
  loading.value = true

  try {
    const { error } = await $supabase.auth.signInWithOtp({
      email: email.value,
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

.app-button:hover {
  --button-bg-color: var(--ms-peach);
  background-color: var(--button-bg-color);
}

:deep(.modal-cat-card .cat-card) {
  width: min(420px, -32px + 100vw);
}

:deep(.modal-cat-card .modal-header) {
  @apply text-center;
}
:deep(.modal-cat-card .modal-header .modal-header__title) {
  @apply text-2xl text-ink;
}
:deep(.modal-cat-card .modal-header .modal-header__description) {
  @apply text-base text-muted;
}

.app-button__submit {
  @apply bg-ink text-bg hover:bg-strong-hover;
}
</style>