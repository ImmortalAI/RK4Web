<script setup lang="ts">
import { ref } from 'vue'
import MathLiveInput from './components/MathLiveInput.vue'

const latex = ref('\\lambda=a+b')
</script>

<template>
  <header>
    <h1 class="text-3xl font-bold underline">Hello</h1>
  </header>

  <main class="flex flex-col justify-center items-center h-screen">
    <MathLiveInput class="min-w-xs" v-model="latex" />
  </main>
</template>
