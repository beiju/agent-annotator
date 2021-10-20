function updateFrame(state, agent, changes) {
    if (!agent) return state
    if (typeof changes === "function") {
        changes = changes(state.frames[state.activeFrame]?.[agent] ?? {})
    }
    return {
        ...state,
        frames: {
            ...state.frames,
            [state.activeFrame]: {
                ...state.frames[state.activeFrame],
                [agent]: {
                    ...state.frames[state.activeFrame]?.[agent] ?? {},
                    ...changes
                }
            }
        }
    }
}

function normalizeAngle(angle) {
    return angle % (Math.PI * 2)
}

export default function reducer(state, action) {
    switch (action.type) {
        case 'set_loading_finished':
            return { ...state, loading: false }
        case 'set_active_agent':
            return { ...state, activeAgent: action.activeAgent }
        case 'set_agent_present':
            return { ...state, agentPresent: { ...state.agentPresent, [action.agent]: action.isPresent } }
        case 'active_agent_toggle_present':
            return {
                ...state,
                agentPresent: { ...state.agentPresent, [state.activeAgent]: !state.agentPresent[state.activeAgent] }
            }
        case 'move_agent':
            return updateFrame(state, action.agentName, { x: action.x, y: action.y })
        case 'rotate_agent':
            return updateFrame(state, action.agentName, agent => ({
                angle: normalizeAngle((agent.angle || 0) + action.by)
            }))
        case 'next_frame':
            if (state.loading) return state
            return {
                ...state,
                loading: true,
                activeFrame: state.activeFrame + 1,
                frames: {
                    ...state.frames,
                    [state.activeFrame + 1]: state.frames[state.activeFrame + 1] ?? state.frames[state.activeFrame],
                }
            }
        case 'previous_frame':
            if (state.loading) return state
            return {
                ...state,
                loading: true,
                activeFrame: state.activeFrame > 1 ? state.activeFrame - 1 : state.activeFrame
            }
        case 'set_agent_is_blurred':
            return updateFrame(state, action.agentName, { isBlurred: action.isBlurred })
        case 'set_agent_is_obscured':
            return updateFrame(state, action.agentName, { isObscured: action.isObscured })
        default:
            throw new Error("Unknown reducer action")
    }
}