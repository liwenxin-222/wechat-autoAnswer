<template>
    <f7-card>
        <f7-card-header>微信视频电话自动接听</f7-card-header>
        <f7-card-content :padding="true">
            <!-- 状态显示 -->
            <f7-block strong inset>
                <p class="status-text">
                    当前状态:
                    <span :class="statusClass">{{ status }}</span>
                </p>
            </f7-block>

            <!-- 启动/暂停 -->
            <f7-block inset>
                <div class="button-row">
                    <f7-button @click="startAutoAnswer" :disabled="status === '运行中'" fill round color="green">启动</f7-button>
                    <f7-button @click="stopAutoAnswer" :disabled="status !== '运行中'" fill round color="red">暂停</f7-button>
                </div>
            </f7-block>

            <!-- 横幅坐标 -->
            <f7-block-title>横幅坐标（可选）</f7-block-title>
            <f7-block inset><p class="section-desc">来电时顶部横幅的位置。不填则自动检测。</p></f7-block>
            <f7-list inset>
                <f7-list-input label="X" type="number" placeholder="540" :value="form.bannerX" @input="form.bannerX = Number($event.target.value)" />
                <f7-list-input label="Y" type="number" placeholder="80" :value="form.bannerY" @input="form.bannerY = Number($event.target.value)" />
            </f7-list>

            <!-- 小窗坐标 -->
            <f7-block-title>小窗坐标（可选）</f7-block-title>
            <f7-block inset><p class="section-desc">操作手机后横幅变成右上角小窗的位置。不填则自动检测。</p></f7-block>
            <f7-list inset>
                <f7-list-input label="X" type="number" placeholder="990" :value="form.floatX" @input="form.floatX = Number($event.target.value)" />
                <f7-list-input label="Y" type="number" placeholder="170" :value="form.floatY" @input="form.floatY = Number($event.target.value)" />
            </f7-list>

            <!-- 接听坐标 -->
            <f7-block-title>接听坐标（可选）</f7-block-title>
            <f7-block inset><p class="section-desc">全屏来电时接听按钮的位置。不填则自动检测。</p></f7-block>
            <f7-list inset>
                <f7-list-input label="X" type="number" placeholder="810" :value="form.answerX" @input="form.answerX = Number($event.target.value)" />
                <f7-list-input label="Y" type="number" placeholder="2100" :value="form.answerY" @input="form.answerY = Number($event.target.value)" />
            </f7-list>

            <!-- 保存 -->
            <f7-block inset>
                <f7-button @click="saveConfig" fill round color="blue">保存配置</f7-button>
            </f7-block>

            <f7-block inset>
                <p class="tip-text">
                    获取坐标：手机设置 → 开发者选项 → 开启"指针位置"。
                    点击时自动加入 ±5px 随机偏移。配置保存后重启也保留。
                </p>
            </f7-block>

            <!-- 日志 -->
            <f7-block-title>运行日志</f7-block-title>
            <f7-block strong inset>
                <div class="log-container">
                    <p v-for="(log, index) in logs" :key="index" class="log-item">{{ log }}</p>
                    <p v-if="logs.length === 0" class="log-empty">暂无日志</p>
                </div>
            </f7-block>
        </f7-card-content>
    </f7-card>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { f7Card, f7CardHeader, f7CardContent, f7Block, f7BlockTitle, f7Button, f7List, f7ListInput } from 'framework7-vue'
import { callHandler, registerHandler } from '../js_bridge'

const status = ref('运行中')
const logs = ref<string[]>([])

const form = reactive({ bannerX: 0, bannerY: 0, floatX: 0, floatY: 0, answerX: 0, answerY: 0 })

const statusClass = computed(() => {
    if (status.value === '运行中') return 'status-running'
    if (status.value === '已暂停') return 'status-paused'
    if (status.value === '通话中') return 'status-calling'
    if (status.value === '接听中...') return 'status-answering'
    return ''
})

function addLog(msg: string) {
    const t = new Date().toLocaleTimeString()
    logs.value.unshift(`[${t}] ${msg}`)
    if (logs.value.length > 100) logs.value = logs.value.slice(0, 100)
}

function startAutoAnswer() { callHandler('start') }
function stopAutoAnswer() { callHandler('stop') }

function saveConfig() {
    callHandler('updateConfig', JSON.stringify({
        bannerX: form.bannerX, bannerY: form.bannerY,
        floatX: form.floatX, floatY: form.floatY,
        answerX: form.answerX, answerY: form.answerY,
    }))
    addLog('已保存 横幅(' + form.bannerX + ',' + form.bannerY + ') 小窗(' + form.floatX + ',' + form.floatY + ') 接听(' + form.answerX + ',' + form.answerY + ')')
}

onMounted(() => {
    registerHandler('onStatusChange', (data: string) => { status.value = data; addLog('状态: ' + data) })
    registerHandler('onLog', (data: string) => { addLog(data) })

    callHandler('getStatus', '', (data: string | null) => {
        if (data) {
            try {
                const c = JSON.parse(data).config
                if (c) {
                    form.bannerX = c.bannerX || 0; form.bannerY = c.bannerY || 0
                    form.floatX = c.floatX || 0; form.floatY = c.floatY || 0
                    form.answerX = c.answerX || 0; form.answerY = c.answerY || 0
                }
            } catch (e) { /* */ }
        }
    })
    addLog('控制面板已就绪')
})
</script>

<style scoped>
.button-row { display: flex; gap: 12px; justify-content: center; }
.button-row > * { flex: 1; }
.status-text { font-size: 16px; font-weight: bold; text-align: center; }
.status-running { color: #4caf50; }
.status-paused { color: #ff9800; }
.status-calling { color: #2196f3; }
.status-answering { color: #e91e63; }
.section-desc { font-size: 12px; color: #888; margin: 0; }
.tip-text { font-size: 12px; color: #888; line-height: 1.6; }
.log-container { max-height: 300px; overflow-y: auto; font-size: 12px; font-family: monospace; }
.log-item { margin: 2px 0; word-break: break-all; }
.log-empty { color: #999; text-align: center; }
</style>
