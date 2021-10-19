function updateAgent(state, agent, changes) {
    if (typeof changes === "function") {
        changes = changes(state[agent])
    }
    return { ...state, [agent]: { ...state[agent], ...changes } }
}

export default function reducer(state, action) {
    switch (action.type) {
        case 'set_agent_present':
            return updateAgent(state, action.agent, { isPresent: action.isPresent })
        case 'toggle_agent_present':
            return updateAgent(state, action.agent, agent => ({ isPresent: !agent.isPresent }))
        default:
            throw new Error("Unknown reducer action")
    }
}