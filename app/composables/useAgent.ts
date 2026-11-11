export const useAgent = () => {
  const minWidth = '1200px'
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