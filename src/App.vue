<script setup lang="ts">
import { f7App, f7View, f7Page, f7Navbar, f7Toolbar, f7Link, f7Button } from 'framework7-vue';
import HomePage from './components/HomePage .vue'
import { callHandler } from './js_bridge'

function exit() {
  callHandler('exit')
}
</script>

<template>
  <f7App theme="auto">
    <f7View main>
      <f7-page>
        <!-- Top Navbar-->
        <f7-navbar title="Awesome App"></f7-navbar>
        <!-- Toolbar-->
        <f7-toolbar bottom>
          <f7-link>Link 1</f7-link>
          <f7-link>Link 3</f7-link>
          <f7-link>Link 2</f7-link>
        </f7-toolbar>
        <HomePage></HomePage>
        <!-- Page Content -->
        <p>Page content goes here</p>
        <f7-link href="/about/">About App</f7-link>
        <f7-button @click="exit" fill round>退出APP</f7-button>
      </f7-page>
    </f7View>
  </f7App>
</template>

<style scoped></style>
