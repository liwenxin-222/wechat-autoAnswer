import { createApp } from 'vue'
import Framework7Vue from 'framework7-vue/bundle'
import Framework7 from 'framework7/lite';

import App from './App.vue'

Framework7.use(Framework7Vue)


createApp(App).mount('#app')
