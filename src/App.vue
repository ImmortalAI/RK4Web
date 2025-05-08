<script setup lang="ts">
import { ref } from 'vue'
import { createScopeTeX } from '@/utils/rk4.ts'

import { useTheme } from '@/composables/useTheme';

const theme = useTheme();

const divMathInputs = ref<HTMLElement | null>();
const divInitialConditions = ref<HTMLElement | null>();
const latex = ref('\\lambda=a+b')
</script>

<template>
  <main class="flex justify-center items-center h-screen">
    <div class="flex flex-col">
      <div ref="divMathInputs" class="flex flex-col">
        <MathLiveInput class="min-w-xs" v-model="latex" />
        <Button label="+" @click="theme.toggleTheme" />
      </div>
      <div ref="divInitialConditions" class="flex flex-col">
      </div>
    </div>
  </main>
</template>
