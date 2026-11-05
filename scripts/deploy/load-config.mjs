// 部署配置加载

// 结构:
//   {
//     "object": { "endpoint", "accessKey", "secretKey", "bucket", "alias" },
//     "nginx": { "host", "root", "backupRoot", "user", "group", "reloadCmd" },
//     "site": "https://suseoaa.com"
//   }

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), 'deploy.local.json')

function readFileConfig() {
    if (!existsSync(configPath)) return {}
    try {
        return JSON.parse(readFileSync(configPath, 'utf8'))
    } catch {
        console.warn('[load-config] deploy.local.json 解析失败，已忽略')
        return {}
    }
}

function pick(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return String(value)
    }
    return undefined
}

export function loadDeployConfig() {
    const file = readFileConfig()
    const object = file.object ?? {}
    const nginx = file.nginx ?? {}
    const site = typeof file.site === 'string' ? file.site : (file.site?.url ?? undefined)
    const nginxRoot = pick(nginx.root, file.nginxRoot)
    return {
        minioEndpoint: pick(object.endpoint, file.minioEndpoint),
        minioAccessKey: pick(object.accessKey, file.minioAccessKey),
        minioSecretKey: pick(object.secretKey, file.minioSecretKey),
        minioBucket: pick(object.bucket, file.minioBucket, 'oaa-fe'),
        minioAlias: pick(object.alias, file.minioAlias, 'obj-service'),
        sshHost: pick(nginx.host, file.sshHost),
        nginxRoot,
        nginxBackupRoot: pick(nginx.backupRoot, file.nginxBackupRoot) ?? (nginxRoot ? `${nginxRoot}.backup` : undefined),
        nginxUser: pick(nginx.user, file.nginxUser, 'www'),
        nginxGroup: pick(nginx.group, file.nginxGroup, 'www'),
        nginxReloadCmd: pick(nginx.reloadCmd, file.nginxReloadCmd, 'sudo -n nginx -s reload'),
        siteUrl: pick(site, file.siteUrl, 'https://suseoaa.com'),
    }
}

export { configPath }
