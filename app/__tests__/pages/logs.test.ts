import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppCatEarCard from '../../components/app/CatEarCard/CatEarCard.vue';
import AppIllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';
import LogsPage from '../../pages/logs.vue';
import { FEATURE_NOT_READY_MESSAGE } from '../../constants/feature';

describe('pages/logs.vue', () => {
  it('keeps the title and shows the not-ready placeholder', () => {
    const w = mount(LogsPage, { global: { components: { AppCatEarCard, AppIllustrationSlot } } });
    expect(w.find('h1').text()).toBe('紀錄');
    const slot = w.find('.app-cat-ear-card .not-ready');
    expect(slot.classes()).toContain('app-illustration-slot');
    expect(slot.find('.app-illustration-slot__label').text()).toBe('貓咪插畫：還在翻紀錄本');
    expect(slot.find('.not-ready__text').text()).toBe(FEATURE_NOT_READY_MESSAGE);
  });
});
