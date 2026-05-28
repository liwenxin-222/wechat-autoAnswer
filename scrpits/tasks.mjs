import { rollup, defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import { execSync } from 'child_process'
import fs from 'fs'
import { copy } from 'fs-extra'
import path from 'node:path'
import { copyFileSync } from 'node:fs';
import axios from 'axios'
import inquirer from 'inquirer'

let isDev
if (process.env.NODE_ENV === 'production') {
    isDev = false
} else {
    isDev = true
}


const input = "dist-autox/main.js"
const outDir = "dist-autox"


export async function clear() {
    await fs.promises.rm(outDir, { recursive: true, force: true })
}
export async function rollupBuild(remoteHost) {
    const config = defineConfig({
        input: {
            'main': input,
        },
        output: {
            dir: outDir,
            format: 'commonjs',
            entryFileNames: "[name].js"
        },
        plugins: [
            resolve(), commonjs(), json(),
            replace({
                preventAssignment: true,
                __DevModel__: String(isDev),
                __DevIp__: remoteHost
            }),
            babel({
                babelHelpers: 'bundled',
                extensions: ['.js', '.ts'],
                exclude: 'node_modules/**', // 排除 node_modules 目录
                presets: ['@babel/preset-env'] // 使用 Babel 的 env 预设
            }), terser(),
        ],
    })
    await clear()
    execSync('vue-tsc -b', { stdio: 'inherit' })
    const bundle = await rollup(config)
    await bundle.write(config.output)
    copyFile()
    return outDir
}

function copyFile() {
    copyFileSync('src-autox/start-ui.js', outDir + '/start-ui.js')
    try {
        copyFileSync("src-autox/project.json", outDir + '/project.json')
    } catch (e) {
        fs.writeFileSync(outDir + '/project.json', JSON.stringify({
            "name": "demo",
            "main": "start-ui.js",
            "ignore": ["build"],
            "packageName": "com.example",
            "versionName": "1.0.0",
            "versionCode": 1
        }))
    }
}

export function copyWebsite() {
    copy('dist', outDir + '/website')
}

export async function getip() {
    const c = '.deviceIpAddress'
    let defip;
    try {
        defip = await fs.promises.readFile(c)
    } catch (e) { }
    const { ip } = await inquirer.prompt([
        {
            type: 'input',
            name: 'ip',
            message: '请输入设备ip地址',
            default: defip,
        }
    ])
    if (ip !== defip) {
        await fs.promises.writeFile(c, ip)
    }

    const uri = `http://${ip}:9317/api/v1`

    try {
        const res = await axios.post(uri, {}, {
            params: {
                type: 'getip'
            }
        })
        const { remoteHost } = res.data
        return { remoteHost, uri };
    } catch (e) {
        throw new Error('连接设备失败：' + e.message)
    }
}