<template>
  <desktop-wrapper>
    <app-header>
      <template v-slot:menu>
        <app-button
          class="login-button"
          variant="surface"
          size="md"
          label="登入"
          @click="openModal"
        >
        </app-button>
      </template>
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
      <!-- Sent: where to look, and resend once the cooldown is over -->
      <template v-if="loginStep === LoginStep.Sent">
        <p class="login-dialog__description" role="status">
          魔法連結寄出去了喵！去 <b class="login-dialog__email">{{ sentEmail }}</b> 收信，點信裡的連結就能登入。
        </p>
        <p class="login-dialog__note">沒收到的話，看看垃圾郵件匣，或等一下再寄一次。</p>
        <app-alert v-if="sendError" class="login-dialog__alert">{{ sendError }}</app-alert>
        <app-turnstile
          v-if="captchaSiteKey"
          ref="turnstile"
          :site-key="captchaSiteKey"
          @verify="onCaptchaVerify"
          @expire="onCaptchaExpire"
          @error="onCaptchaError"
        />
        <app-button variant="strong" full :label="sendButtonLabel" :disabled="!canSend" @click="onResendClick" />
        <app-button variant="secondary" full label="換一個信箱" @click="onChangeEmailClick" />
      </template>

      <!-- Enter in the field submits too -->
      <form v-else class="login-dialog__form" novalidate @submit.prevent="onMagicLinkClick">
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
        <app-alert v-if="sendError" class="login-dialog__alert">{{ sendError }}</app-alert>
        <app-turnstile
          v-if="captchaSiteKey"
          ref="turnstile"
          :site-key="captchaSiteKey"
          @verify="onCaptchaVerify"
          @expire="onCaptchaExpire"
          @error="onCaptchaError"
        />
        <app-button variant="strong" full :label="sendButtonLabel" :disabled="!canSend" @click="onMagicLinkClick" />
      </form>
    </app-dialog>
  </desktop-wrapper>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { CAPTCHA_LOAD_FAILED_MESSAGE, LOGIN_ERROR_MESSAGES, MAGIC_LINK_COOLDOWN_SECONDS } from '~/constants/auth';
import { SupabaseErrorKind } from '~/utils/supabaseErrors';
import { validateEmail } from '~/utils/validators';

/** The dialog asks for the email, then says where the link went */
enum LoginStep {
  Form = 'form',
  Sent = 'sent',
}
const SECOND_MS = 1000;

const {
  isShowModal,
  openModal,
  closeModal
} = useLayoutMenuState();

const { signInWithMagicLink } = useAuth();

// 人機驗證 (Cloudflare Turnstile), on when a site key is configured (NUXT_PUBLIC_TURNSTILE_SITE_KEY).
// Each token works once: it is cleared after a send and the widget asked for a new one.
const captchaSiteKey = useRuntimeConfig().public.turnstileSiteKey;
const turnstile = ref<{ reset: () => void } | null>(null);
const captchaToken = ref('');
const onCaptchaVerify = (token: string) => {
  captchaToken.value = token;
  if (sendError.value === CAPTCHA_LOAD_FAILED_MESSAGE) sendError.value = '';
};
const onCaptchaExpire = () => {
  captchaToken.value = '';
};
const onCaptchaError = () => {
  captchaToken.value = '';
  sendError.value = CAPTCHA_LOAD_FAILED_MESSAGE;
};
const isWaitingForCaptcha = computed(() => !!captchaSiteKey && !captchaToken.value);

const loading = ref(false);
const loginStep = ref(LoginStep.Form);
/** The address the last link went to */
const sentEmail = ref('');
/** Why the last send failed (not an email format error: that shows under the field) */
const sendError = ref('');

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

// After a send (or a rate-limit error) another link can wait: count down, then allow it again.
// Keeps counting while the dialog is closed, so reopening doesn't skip the wait.
const cooldownSeconds = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;
const stopCooldown = () => {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = null;
};
const startCooldown = (seconds: number) => {
  stopCooldown();
  cooldownSeconds.value = seconds;
  cooldownTimer = setInterval(() => {
    cooldownSeconds.value -= 1;
    if (cooldownSeconds.value <= 0) {
      stopCooldown();
      // The wait is over: the rate-limit message no longer applies
      sendError.value = '';
    }
  }, SECOND_MS);
};
onBeforeUnmount(stopCooldown);

const canSend = computed(() => !loading.value && cooldownSeconds.value <= 0 && !isWaitingForCaptcha.value);
const sendButtonLabel = computed(() => {
  if (loading.value) return '寄送中...';
  if (cooldownSeconds.value > 0) return `${cooldownSeconds.value} 秒後可以再寄`;
  if (isWaitingForCaptcha.value) return '完成人機驗證後就能寄';
  return loginStep.value === LoginStep.Sent ? '重新寄送' : '寄送魔法連結';
});

const onDialogClose = () => {
  email.error = '';
  sendError.value = '';
  loginStep.value = LoginStep.Form;
  closeModal();
};

const sendMagicLink = async (address: string) => {
  loading.value = true;
  sendError.value = '';
  const result = await signInWithMagicLink(address, captchaToken.value || undefined);
  loading.value = false;
  // The token is used up either way: get a new one for the next send
  captchaToken.value = '';
  turnstile.value?.reset();

  if (result.success) {
    sentEmail.value = address;
    loginStep.value = LoginStep.Sent;
    startCooldown(MAGIC_LINK_COOLDOWN_SECONDS);
    return;
  }
  if (result.kind === SupabaseErrorKind.InvalidInput) {
    // The server refused the address: say so under the field
    loginStep.value = LoginStep.Form;
    email.error = LOGIN_ERROR_MESSAGES[result.kind];
    return;
  }
  sendError.value = LOGIN_ERROR_MESSAGES[result.kind];
  if (result.kind === SupabaseErrorKind.RateLimit) startCooldown(result.retryAfterSeconds ?? MAGIC_LINK_COOLDOWN_SECONDS);
};

const onMagicLinkClick = async () => {
  if (!canSend.value) return;
  email.error = validateEmail(email.value);
  if (email.error) {
    emailInput.value?.$el?.querySelector('input')?.focus();
    return;
  }
  await sendMagicLink(email.value.trim());
};

const onResendClick = async () => {
  if (!canSend.value) return;
  await sendMagicLink(sentEmail.value);
};

const onChangeEmailClick = () => {
  sendError.value = '';
  loginStep.value = LoginStep.Form;
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
.login-dialog__email {
  @apply font-medium text-ink break-all;
}
.login-dialog__note {
  @apply text-center text-helper text-muted;
}
/* The form keeps the dialog's own spacing between its children */
.login-dialog__form {
  @apply flex flex-col gap-4;
}
</style>