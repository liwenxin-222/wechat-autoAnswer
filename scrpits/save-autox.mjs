import { getip, rollupBuild, copyWebsite } from './tasks.mjs'
import axios from 'axios'
import archiver from 'archiver'
import inquirer from 'inquirer'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const { uri } = await getip()

execSync('npm run build', { stdio: 'inherit' })
const outDir = await rollupBuild()
copyWebsite()
let defName;
try {
    defName = JSON.parse(readFileSync(outDir + "/project.json")).name
} catch (e) { }
const { saveName } = await inquirer.prompt([{
    type: 'input',
    name: 'saveName',
    message: '请输入保存名称：',
    default: defName
}])
if (!saveName) {
    throw Error('保存名称不能为空');
}
const zip = archiver('zip');
axios.post(uri, zip, {
    params: {
        type: 'saveProject',
        dirName: outDir,
        saveName,
    }
}).then((res) => {
    console.log('操作完成');
}).catch((err) => {
    console.error("上传项目失败：", err.message);
})
zip.directory(outDir)
zip.finalize()