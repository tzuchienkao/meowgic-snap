import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  try {
    const config = useRuntimeConfig()

    const supabaseUrl = config.public.supabaseUrl
    const supabaseKey = config.public.supabaseKey

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Supabase Plugin] 缺少認證資訊!', {
        url: !!supabaseUrl,
        key: !!supabaseKey
      })
      return {}
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey)

      return {
        provide: {
          supabase
        }
      }
    }
  } catch (err) {
    console.error('[Supabase Plugin] ❌ 錯誤:', err)
    return {}
  }
})
