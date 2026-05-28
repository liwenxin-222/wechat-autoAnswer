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

            <!-- 控制按钮 -->
            <f7-block inset>
                <div class="button-row">
                    <f7-button
                        @click="startAutoAnswer"
                        :disabled="status === '运行中'"
                        fill
                        round
                        color="green"
                    >
                        启动
                    </f7-button>
                    <f7-button
                        @click="stopAutoAnswer"
                        :disabled="status !== '运行中'"
                        fill
                        round
                        color="red"
                    >
                        暂停
                    </f7-button>
                </div>
            </f7-block>

            <!-- 日志区域 -->
            <f7-block-title>运行日志</f7-block-title>
            <f7-block strong inset>
                <div class="log-container">
                    <p v-for="(log, index) in logs" :key="index" class="log-item">
                        {{ log }}
                    </p>
                    <p v-if="logs.length === 0" class="log-empty">暂无日志</p>
                </div>
            </f7-block>
        </f7-card-content>
    </f7-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { f7Card, f7CardHeader, f7CardContent, f7Block, f7BlockTitle, f7Button } from 'framework7-vue'
import { callHandler, registerHandler } from '../js_bridge'

// 响应式状态
const status = ref('运行中')
const logs = ref<string[]>([])

// 状态样式
const statusClass = computed(() => {
    if (status.value === '运行中') return 'status-running'
    if (status.value === '已暂停') return 'status-paused'
    if (status.value === '通话中') return 'status-calling'
    if (status.value === '接听中...') return 'status-answering'
    return ''
})

// 添加日志（最多保留 50 条）
function addLog(msg: string) {
    const time = new Date().toLocaleTimeString()
    logs.value.unshift(`[${time}] ${msg}`)
    if (logs.value.length > 50) {
        logs.value = logs.value.slice(0, 50)
    }
}

// 启动自动接听
function startAutoAnswer() {
    callHandler('start')
}

// 暂停自动接听
function stopAutoAnswer() {
    callHandler('stop')
}

// 注册 JsBridge 回调，接收 AutoX 端的状态变更
onMounted(() => {
    // 接收状态变更
    registerHandler('onStatusChange', (data: string) => {
        status.value = data
        addLog('状态变更: ' + data)
    })

    // 接收日志
    registerHandler('onLog', (data: string) => {
        addLog(data)
    })

    addLog('控制面板已就绪')
})
</script>

<style scoped>
.button-row {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.button-row > * {
    flex: 1;
}

.status-text {
    font-size: 16px;
    font-weight: bold;
    text-align: center;
}

.status-running {
    color: #4caf50;
}

.status-paused {
    color: #ff9800;
}

.status-calling {
    color: #2196f3;
}

.status-answering {
    color: #e91e63;
}

.log-container {
    max-height: 200px;
    overflow-y: auto;
    font-size: 12px;
    font-family: monospace;
}

.log-item {
    margin: 2px 0;
    word-break: break-all;
}

.log-empty {
    color: #999;
    text-align: center;
}
</style>
