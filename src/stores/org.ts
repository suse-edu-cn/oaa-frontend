import { ref } from 'vue'
import { defineStore } from 'pinia'

import request from '@/utils/request'
import setToast from '@/utils/setToast'
import type { ApiResponse, DepartmentItem, RoleItem } from '@/types'

/** 部门 & 职位架构引用数据 */
export const useOrgStore = defineStore('org', () => {
    const departments = ref<DepartmentItem[]>([])
    const roles = ref<RoleItem[]>([])
    const loaded = ref(false)

    async function fetchAll(): Promise<boolean> {
        const [deptResp, roleResp] = await Promise.all([
            request<ApiResponse<DepartmentItem[]>>({
                url: '/department/list',
                method: 'GET',
            }),
            request<ApiResponse<RoleItem[]>>({
                url: '/role/list',
                method: 'GET',
            }),
        ])

        if (deptResp?.code == 200) {
            departments.value = deptResp.data
        } else {
            setToast('error', '获取部门列表失败', deptResp?.message || '未知错误，请联系负责后端的同学')
        }

        if (roleResp?.code == 200) {
            roles.value = roleResp.data
        } else {
            setToast('error', '获取职位列表失败', roleResp?.message || '未知错误，请联系负责后端的同学')
        }

        // 两项都成功才算加载完成，失败时下次进入页面仍会重试
        loaded.value = deptResp?.code == 200 && roleResp?.code == 200
        return loaded.value
    }

    /** 首次调用时请求，之后直接复用缓存 */
    async function ensureLoaded() {
        if (!loaded.value) {
            await fetchAll()
        }
    }
    async function refresh() {
        await fetchAll()
    }

    return { departments, roles, loaded, ensureLoaded, refresh }
})
