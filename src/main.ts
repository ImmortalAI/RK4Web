import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config'
import Material from '@primeuix/themes/material'

import { MathfieldElement } from 'mathlive'
MathfieldElement.fontsDirectory = ''
MathfieldElement.soundsDirectory = ''

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Material,
    options: {
      darkModeSelector: '.dark',
    },
  },
})
app.mount('#app')
