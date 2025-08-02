<template>
  <div class="header-container">
    <div v-t="'app.name'" class="title" />
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.header-container {
  padding: 10px;
  background-color: $header-background-color;
  border-radius: 15px;

  .title {
    text-align: center;
    font-size: 25px;
    font-weight: bold;
  }
}
</style>
