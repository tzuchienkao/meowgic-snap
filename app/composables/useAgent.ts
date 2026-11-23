export const useAgent = () => {
  // Design system: NavPills collapse to the ☰ menu under 900px
  // (keep in sync with --breakpoint-desktop in assets/css/main.css)
  const minWidth = '900px'
  const agentMode = useState('agentMode', () => '')
  
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