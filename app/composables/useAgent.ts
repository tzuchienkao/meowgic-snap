export const useAgent = () => {
  // Design system: NavPills collapse to the ☰ menu under 900px
  // (keep in sync with --breakpoint-desktop in assets/css/main.css)
  const minWidth = '900px'
  // SSR has no window: guess from the user agent so a phone gets the mobile layout in the first
  // HTML; the browser corrects it with the real width (setAgentMode) once mounted
  const agentMode = useState('agentMode', () => {
    if (!import.meta.server) return ''
    const userAgent = useRequestHeaders(['user-agent'])['user-agent'] ?? ''
    return /Mobi|Android|iPhone|iPad/i.test(userAgent) ? 'mobile' : 'desktop'
  })
  
  const setAgentMode = () => {
    if (window?.innerWidth < parseInt(minWidth)) {
      agentMode.value = 'mobile'
    } else {
      agentMode.value = 'desktop'
    }
  }
  const getAgentMode = () => agentMode.value

  const initAgentMode = () => {
    if (import.meta.client) {
      window.addEventListener('resize', setAgentMode)
    }
  }

  const cleanupAgentMode = () => {
    if (import.meta.client) {
      window.removeEventListener('resize', setAgentMode)
    }
  }

  return {
    agentMode,
    setAgentMode,
    getAgentMode,
    initAgentMode,
    cleanupAgentMode
  }
}