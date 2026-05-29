import { rollupBuild, copyWebsite } from './tasks.mjs'
import { execSync } from 'child_process'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

execSync('npm run build', { stdio: 'inherit' })
await rollupBuild()

copyWebsite()

// 打包成 zip，方便传到手机
const zipPath = path.resolve('dist-autox.zip')
const output = fs.createWriteStream(zipPath)
const archive = archiver('zip', { zlib: { level: 9 } })

output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2)
    console.log(`\n已打包: dist-autox.zip (${sizeMB} MB)`)
    console.log('把这个文件传到手机，用 AutoX.js 导入即可\n')
})

archive.on('error', (err) => { throw err })
archive.pipe(output)
archive.directory('dist-autox/', false)
await archive.finalize()