import { rollupBuild, copyWebsite } from './tasks.mjs'
import { execSync } from 'child_process'

execSync('npm run build', { stdio: 'inherit' })
await rollupBuild()

copyWebsite()