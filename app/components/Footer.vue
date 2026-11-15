<template>
  <div class="footer">
    <div class="left-part">
      <LangSwitcher />
      <ThemeToggle />
    </div>
    <div class="github-link">
      <NuxtLink
        to="https://github.com/PABERTHIER/picto-lite"
        :aria-label="githubLinkLabel"
        :name="githubLinkLabel"
        :title="githubLinkLabel"
        target="_blank">
        <Icon
          name="pl-icon:github-mark"
          size="34px"
          mode="svg"
          aria-hidden="true" />
      </NuxtLink>
    </div>
    <div class="right-part">
      {{ authorName }} © {{ new Date().getFullYear() }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const githubLinkLabel = computed(() => t('components.footer.github_link_label'))
const authorName = computed(() => t('about.author'))
</script>

<style lang="scss" scoped>
.footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px 16px;
  align-items: center;
  min-height: $footer-height;
  padding: 12px max(20px, env(safe-area-inset-right, 0px)) 12px
    max(20px, env(safe-area-inset-left, 0px));
  background-color: var(--color-shell);

  .left-part {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .github-link {
    display: flex;
    align-items: center;

    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
    }
  }

  .right-part {
    min-width: 0;
    justify-self: end;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

@container footer (max-width: 40rem) {
  .footer {
    grid-template-columns: minmax(0, max-content) 44px;
    justify-content: center;
    gap: 8px 12px;
    padding-inline: max(16px, env(safe-area-inset-left, 0px))
      max(16px, env(safe-area-inset-right, 0px));

    .left-part {
      justify-content: center;
    }

    .right-part {
      grid-column: 1 / -1;
      justify-self: center;
      text-align: center;
    }
  }
}

// Switch before the preferences wrap beside the icon, including with larger text
@container footer (max-width: 22rem) {
  .footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;

    .left-part {
      flex-basis: 100%;
      justify-content: center;
    }

    .right-part {
      text-align: center;
    }
  }
}
</style>
