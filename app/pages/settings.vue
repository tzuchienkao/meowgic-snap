<template>
  <div class="page-settings flex flex-col gap-5">
    <app-page-header title="設定" description="這裡改的設定都會幫你記住，下次登入還在喵" />
    <!-- DS: one column under 900px, two columns from 900px (desktop: breakpoint) -->
    <div class="page-settings__body grid grid-cols-1 items-start gap-6 desktop:grid-cols-2">
      <div class="page-settings__column">
        <!-- 個人資料 -->
        <app-cat-ear-card class="profile-card">
          <h2 class="text-ink text-lg">個人資料</h2>
          <app-input
            label="個人名稱"
            :model-value="userName.value"
            :invalid="userName.hasError"
            :hint="userName.hasError ? userName.errorMessage : NAME_HINT"
            :count="`${userName.value.length} / ${MAX_DISPLAY_NAME_LENGTH}`"
            @update:model-value="onUserNameUpdate"
          >
            <template #trailing>
              <app-button
                v-if="canSaveName"
                class="profile-card__save"
                size="md"
                label="儲存"
                :disabled="isSavingName"
                @click="onSaveNameClick"
              />
            </template>
          </app-input>
          <app-input label="登入信箱" :model-value="userEmail" readonly />
        </app-cat-ear-card>

        <!-- 帳號 -->
        <app-card class="account-card" title="帳號">
          <div class="account-row account-row--soft">
            <div class="account-row__text">
              <p class="account-row__title">停用帳號</p>
              <p class="account-row__desc text-muted">先讓貓咪睡一下。紀錄會保留，之後用同一個信箱登入就會恢復。</p>
            </div>
            <app-button variant="outline" size="md" label="停用" @click="onDeactivateClick" />
          </div>
          <div class="account-row account-row--warn">
            <div class="account-row__text">
              <p class="account-row__title">刪除帳號</p>
              <p class="account-row__desc text-warn-text">{{ DELETE_WARNING }}</p>
            </div>
            <app-button variant="danger" size="md" label="刪除帳號" @click="isDeleteDialogOpen = true" />
          </div>
        </app-card>
      </div>

      <!-- 偏好設定 -->
      <app-cat-ear-card class="preferences-card">
        <div class="preferences-card__header">
          <h2 class="text-ink text-lg">偏好設定</h2>
          <!-- Save status of the member's latest change; polite live region so it is announced -->
          <p class="preferences-card__status" :class="`preferences-card__status--${saveStatus}`" aria-live="polite">
            {{ SAVE_STATUS_TEXT[saveStatus] }}
            <button
              v-if="saveStatus === MemberSaveStatus.Failed"
              type="button"
              class="preferences-card__retry"
              @click="retrySave"
            >
              再試一次
            </button>
          </p>
        </div>
        <app-preferences-form />
      </app-cat-ear-card>
    </div>

    <!-- Delete confirm (UI only for now: nothing is deleted) -->
    <app-dialog
      :open="isDeleteDialogOpen"
      alert
      title="確定要刪除帳號？"
      @close="isDeleteDialogOpen = false"
    >
      <app-illustration-slot class="delete-dialog-placeholder">
        <img src="~/assets/images/cats-holding-book.svg" class="h-30" alt="貓咪插畫：緊抓帳本不放" />
      </app-illustration-slot>
      <p class="delete-dialog__text">{{ DELETE_WARNING }}</p>
      <div class="delete-dialog__actions">
        <app-button variant="danger" full label="刪除帳號" @click="onDeleteConfirmClick" />
        <app-button variant="secondary" full label="先不要" @click="isDeleteDialogOpen = false" />
      </div>
    </app-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { MAX_DISPLAY_NAME_LENGTH } from '~/constants/user';
import { usePreferences } from '~/composables/usePreferences';
import { MemberSaveStatus } from '~/types/preferences';
import { FEATURE_NOT_READY_MESSAGE } from '~/constants/feature';

const NAME_HINT = '顯示在右上角';
const DELETE_WARNING = '帳號和全部紀錄都會永久刪除，救不回來喵。';
const MESSAGES = {
  nameSaved: '名稱存好了喵',
  nameFailed: '名稱沒有存成功喵，再試一次看看',
} as const;

const { user, updateUserName } = useAuth();
const { showToast } = useToast();
const { saveStatus, retrySave } = usePreferences();

const SAVE_STATUS_TEXT: Record<MemberSaveStatus, string> = {
  [MemberSaveStatus.Saved]: '已自動儲存',
  [MemberSaveStatus.Saving]: '儲存中…',
  [MemberSaveStatus.Failed]: '沒存成功',
};

const userEmail = computed(() => user.value?.email || '');
const savedName = computed(() => user.value?.display_name || '');

const userName = reactive({
  value: savedName.value,
  hasError: false,
  errorMessage: '',
});

const isSavingName = ref(false);
const isDeleteDialogOpen = ref(false);

// 儲存 shows only for a valid name that differs from the saved one
const canSaveName = computed(() => !userName.hasError && userName.value !== savedName.value);

const onUserNameUpdate = (value: string) => {
  userName.value = value;
  userName.hasError = value.length > MAX_DISPLAY_NAME_LENGTH;
  userName.errorMessage = userName.hasError ? `最多 ${MAX_DISPLAY_NAME_LENGTH} 個字` : '';
};

const onSaveNameClick = async () => {
  if (!canSaveName.value) return;
  isSavingName.value = true;
  try {
    const isSaved = await updateUserName(userName.value);
    showToast(isSaved ? MESSAGES.nameSaved : MESSAGES.nameFailed);
  } catch {
    showToast(MESSAGES.nameFailed);
  } finally {
    isSavingName.value = false;
  }
};

// 停用 / 刪除帳號: UI only for now
const onDeactivateClick = () => {
  showToast(FEATURE_NOT_READY_MESSAGE);
};

const onDeleteConfirmClick = () => {
  isDeleteDialogOpen.value = false;
  showToast(FEATURE_NOT_READY_MESSAGE);
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.page-settings__column {
  @apply flex flex-col gap-6;
}

.account-row {
  @apply flex flex-wrap items-center justify-between gap-3 rounded-inset px-4 py-3;
}
.account-row--soft {
  @apply bg-soft;
}
.account-row--warn {
  @apply bg-warn-bg;
}
.account-row__text {
  @apply flex flex-1 basis-48 flex-col gap-1;
}
.account-row__title {
  @apply text-body-md font-medium text-ink;
}
.account-row__desc {
  @apply text-helper;
}

.preferences-card__header {
  @apply flex items-baseline justify-between gap-3;
}
.preferences-card__status {
  @apply flex items-baseline gap-2 text-xs text-muted;
}
.preferences-card__status--failed {
  @apply text-danger;
}
.preferences-card__retry {
  @apply text-link underline underline-offset-2 hover:text-link-hover cursor-pointer;
}

.delete-dialog-placeholder {
  @apply h-30;
  background: transparent;
}
.delete-dialog__text {
  @apply text-center text-body-md text-ink;
}
.delete-dialog__actions {
  @apply flex flex-col gap-2;
}
</style>
