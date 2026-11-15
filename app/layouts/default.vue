<template>
  <div id="layoutContainer">
    <header id="header-container">
      <Header />
    </header>
    <main id="page-container">
      <div class="page-content">
        <slot />
      </div>
    </main>
    <footer id="footer-container">
      <Footer />
    </footer>
  </div>
</template>

<script setup lang="ts">
function setVh() {
  // set --vh to 1% of the current viewport height
  document.documentElement.style.setProperty(
    '--vh',
    `${window.innerHeight * 0.01}px`
  )
}

onMounted(() => {
  setVh()
  window.addEventListener('resize', setVh, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
})
</script>

<style lang="scss">
* {
  box-sizing: border-box;
}

html {
  font-family:
    'Nunito', 'Inter', 'Manrope', 'Poppins', 'Sora', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  color: var(--color-text);
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  background-color: var(--color-page);
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--color-page);

  #__nuxt,
  #__layout {
    background-color: var(--color-page);
  }
}

::-webkit-scrollbar {
  width: 7px;
  height: 7px;
  border-radius: 10px;
}

::-webkit-scrollbar-track {
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background-color: var(--color-scrollbar-track);
  box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.3);
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(
    45deg,
    $grey-blue-color,
    var(--color-scrollbar-thumb)
  );
  border-radius: 10px;
}

#layoutContainer {
  display: flex;
  flex-direction: column;
  min-height: calc(var(--vh, 1vh) * 100);
  background-color: var(--color-page);

  #header-container {
    max-height: $header-height;
    position: sticky;
    padding: 20px 20px 0px 20px;
    top: 0;
    z-index: $header-z-index;
    background-color: var(--color-page);
  }

  #page-container {
    flex: 1;
    min-width: 0;
    background-color: var(--color-page);

    .page-content {
      padding: 20px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    }
  }

  #footer-container {
    container: footer / inline-size;
    width: 100%;
    flex-shrink: 0;
    min-height: $footer-height;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: $footer-z-index;
    background-color: var(--color-shell);
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  }
}

// Handle safe areas on modern devices
@supports (padding: max(0px)) {
  #layoutContainer {
    #footer-container {
      padding-bottom: max(env(safe-area-inset-bottom), 0px);
    }

    #page-container .page-content {
      padding-bottom: calc(20px + max(env(safe-area-inset-bottom), 0px));
    }
  }
}

// Mobile optimizations
@media screen and (max-width: $sm) {
  html {
    -webkit-text-size-adjust: 100%;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
