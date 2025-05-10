import './assets/main.css';
import 'primeicons/primeicons.css';

import { createApp } from 'vue';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

import { MathfieldElement } from 'mathlive';
MathfieldElement.fontsDirectory = '';
MathfieldElement.soundsDirectory = '';

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark',
    },
  },
});
app.mount('#app');
