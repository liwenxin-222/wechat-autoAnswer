<template>
    <f7-card>
        <f7-card-content :padding="false">
            <f7-list>
                <f7-list-item @click="onClick('Link 1')" link="#">Link 1</f7-list-item>
                <f7-list-item @click="onClick('Link 2')" link="#">Link 2</f7-list-item>
                <f7-list-item @click="onClick('Link 3')" link="#">Link 3</f7-list-item>
                <f7-list-item @click="onClick('Link 4')" link="#">Link 4</f7-list-item>
                <f7-list-item @click="onClick('Link 5')" link="#">Link 5</f7-list-item>
            </f7-list>
        </f7-card-content>
    </f7-card>
</template>
<script setup lang="ts">
import { f7Card, f7CardContent, f7List, f7ListItem } from 'framework7-vue'
import { callHandler } from '../js_bridge'

function onClick(c?: string) {
    callHandler('test', "" + c)
}
</script>
<style lang="">

</style>