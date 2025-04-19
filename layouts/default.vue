<template>
  <div id="layoutContainer">
    <div id="header-container">
      <Header />
    </div>
    <div id="page-container">
      <slot />
    </div>
    <div id="footer-container">
      <Footer />
    </div>
  </div>
</template>

<style lang="scss">
@use '~/styles/default.scss' as *;

html {
  font-family: 'Nunito', 'Inter', 'Manrope', 'Poppins', 'Sora', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
  height: 100%;
  width: 100%;
  color: $primary-text-color;
}

body {
  height: 100%;
  width: 100%;
  overflow: hidden;
  margin: 0px;

  #__nuxt,
  #__layout {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
  }
}

#layoutContainer {
  height: 100vh;
  background-color: $background-color;

  #header-container {
    max-height: calc($header-height-desktop + 20px);
    top: 0;
    padding: 20px 20px 0px 20px;
  }

  #page-container {
    height: calc(100vh - $header-height-desktop - $footer-height - 20px);
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  #footer-container {
    width: 100%;
    height: $footer-height;
    position: fixed;
    bottom: 0;
  }

  @media (max-width: $sm) {
    #header-container {
      max-height: calc($header-height-mobile + 20px);
    }

    #page-container {
      height: calc(100vh - $header-height-mobile - $footer-height - 20px);
    }
  }
}

#page-container::-webkit-scrollbar {
  width: 7px;
  border-radius: 10px;
}

#page-container::-webkit-scrollbar-track {
  border-radius: 10px;
  border: 1px solid #caca;
  background-color: #f1f1f1;
  box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.3);
}

#page-container::-webkit-scrollbar-thumb {
  background: linear-gradient(45deg, $grey-blue-color, $dark-red-color);
  border-radius: 10px;
}
</style>
