import inquirer from 'inquirer'
import fs from 'fs-extra'
import axios from 'axios'
import { rollupBuild, getip } from './tasks.mjs'
import archiver from 'archiver'

const { remoteHost, uri } = await getip()
await buildDev(remoteHost)


async function buildDev(remoteHost) {
    const outDir = await rollupBuild(`'${remoteHost}'`)
    runProject(outDir)
}
function runProject(outDir) {
    const zip = archiver('zip');
    axios.post(uri, zip, {
        params: {
            type: 'runProject',
            dirName: outDir
        }
    }).then((res) => {
        console.log('操作完成');
    }).catch((err) => {
        console.error("上传项目失败：", err.message);
    })
    zip.directory(outDir)
    zip.finalize()
}