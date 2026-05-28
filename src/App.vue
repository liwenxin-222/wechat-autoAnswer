<script setup lang="ts">
import { f7App, f7View, f7Page, f7Navbar, f7Button, f7Block } from 'framework7-vue';
import HomePage from './components/HomePage.vue'
import { callHandler } from './js_bridge'

function exit() {
  callHandler('exit')
}
</script>

<template>
  <f7App theme="auto">
    <f7View main>
      <f7-page>
        <!-- 顶部导航栏 -->
        <f7-navbar title="微信自动接听" />
        <!-- 首页内容：控制面板 -->
        <HomePage />
        <!-- 底部退出按钮 -->
        <f7-block inset>
          <f7-button @click="exit" fill round color="red">退出</f7-button>
        </f7-block>
      </f7-page>
    </f7View>
  </f7App>
</template>

<style scoped></style>
