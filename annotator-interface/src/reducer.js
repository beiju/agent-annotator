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
                    ...changes,
                },
            },
        },
    }
}

function normalizeAngle(angle) {
    return angle % (Math.PI * 2)
}

function stepAdvanceDispatch(state) {
    const presentAgentIds = Object.keys(state.agents).sort()

    const idx = presentAgentIds.indexOf(state.activeAgent)

    // First, if there is no active agent, try to activate the first present agent
    if (!state.activeAgent || idx < 0) {
        if (presentAgentIds.length > 0) {
            return { type: 'set_active_agent', activeAgent: presentAgentIds[0] }
        } else {
            // If there aren't any present agents, just go to the next frame
            return { type: 'next_frame' }
        }
    }

    // Try to activate the next present agent
    if (idx + 1 < presentAgentIds.length) {
        return { type: 'set_active_agent', activeAgent: presentAgentIds[idx + 1] }
    }

    // If nothing else worked, advance the frame and reset the agent
    return { type: 'advance_frame_and_set_agent', activeAgent: presentAgentIds[0] }
}

function stepRetreatDispatch(state) {
    const presentAgentIds = Object.keys(state.agents).sort().reverse()

    const idx = presentAgentIds.indexOf(state.activeAgent)

    // First, if there is no active agent, try to activate the first present agent
    if (!state.activeAgent || idx < 0) {
        if (presentAgentIds.length > 0) {
            return { type: 'set_active_agent', activeAgent: presentAgentIds[0] }
        } else {
            // If there aren't any present agents, just go to the previous frame
            return { type: 'previous_frame' }
        }
    }

    // Try to activate the next present agent
    if (idx + 1 < presentAgentIds.length) {
        return { type: 'set_active_agent', activeAgent: presentAgentIds[idx + 1] }
    }

    // If nothing else worked, advance the frame and reset the agent
    return { type: 'retreat_frame_and_set_agent', activeAgent: presentAgentIds[0] }
}

function clampFrame(settings, frameNum) {
    // convert to 0-indexed for math
    frameNum -= 1
    // clamp to existing frames
    frameNum = Math.max(0, Math.min(frameNum, settings.numFrames - 1))
    // round to the sample rate
    frameNum = Math.round(frameNum / settings.sampleRate) * settings.sampleRate
    // convert back to 1-indexed
    frameNum += 1
    return frameNum
}

export default function reducer(state, action) {
    // The only action that can be performed before initial state is received is to receive the initial state
    if (!state.settings && action.type !== 'set_state') {
        console.warn("Received", action.type, "action before initial state from server")
        return state
    }

    switch (action.type) {
        case 'set_state':
            return action.state
        case 'set_loading_finished':
            return { ...state, loading: false }
        case 'set_active_agent':
            return { ...state, activeAgent: action.activeAgent }
        case 'set_agent_present':
            return { ...state, agentPresent: { ...state.agentPresent, [action.agent]: action.isPresent } }
        case 'set_agent_flipped':
            return { ...state, agentFlipped: { ...state.agentFlipped, [action.agent]: action.isFlipped } }
        case 'active_agent_toggle_present':
            return {
                ...state,
                agentPresent: { ...state.agentPresent, [state.activeAgent]: !state.agentPresent[state.activeAgent] },
            }
        case 'set_agent_position':
            return updateFrame(state, action.agentId, { x: action.x, y: action.y })
        case 'rotate_agent':
            return updateFrame(state, action.agentId, agent => ({
                angle: normalizeAngle((agent.angle || 0) + action.by),
            }))
        case 'rotate_active_agent':
            return reducer(state, { type: 'rotate_agent', agentId: state.activeAgent, by: action.by })
        case 'move_agent':
            return updateFrame(state, action.agentId, agent => ({
                x: (agent.x || 0) + (action.x || 0),
                y: (agent.y || 0) + (action.y || 0),
            }))
        case 'move_active_agent':
            return reducer(state, { type: 'move_agent', agentId: state.activeAgent, x: action.x, y: action.y })
        case 'next_frame':
            if (state.loading) return state
            const prevActiveFrame = state.activeFrame
            const activeFrame = clampFrame(state.settings, state.activeFrame + state.settings.sampleRate)
            return {
                ...state,
                loading: true,
                activeFrame,
                frames: {
                    ...state.frames,
                    [activeFrame]: state.frames[activeFrame] ?? state.frames[prevActiveFrame],
                },
            }
        case 'previous_frame':
            return {
                ...state,
                loading: true,
                activeFrame: clampFrame(state.settings, state.activeFrame - state.settings.sampleRate),
            }
        case 'jump_to_frame':
            return {
                ...state,
                loading: true,
                activeFrame: clampFrame(state.settings, action.frame),
            }
        case 'set_agent_is_blurred':
            return updateFrame(state, action.agentId, { isBlurred: action.isBlurred })
        case 'toggle_active_agent_is_blurred':
            return updateFrame(state, state.activeAgent, current => ({ isBlurred: !current.isBlurred }))
        case 'set_agent_is_obscured':
            return updateFrame(state, action.agentId, { isObscured: action.isObscured })
        case 'toggle_active_agent_is_obscured':
            return updateFrame(state, state.activeAgent, current => ({ isObscured: !current.isObscured }))
        case 'step_advance':
            return reducer(state, stepAdvanceDispatch(state))
        case 'step_retreat':
            return reducer(state, stepRetreatDispatch(state))
        case 'advance_frame_and_set_agent':
            if (state.loading) return state
            return reducer(
                    reducer(state, { type: 'next_frame' }),
                    { type: 'set_active_agent', activeAgent: action.activeAgent })
        case 'retreat_frame_and_set_agent':
            if (state.loading) return state
            return reducer(
                    reducer(state, { type: 'previous_frame' }),
                    { type: 'set_active_agent', activeAgent: action.activeAgent })
        case 'set_dish_mask_position':
            return {
                ...state,
                dishMask: {
                    ...state.dishMask,
                    x: action.x,
                    y: action.y,
                },
            }
        case 'set_dish_mask_radius':
            return {
                ...state,
                dishMask: {
                    ...state.dishMask,
                    radius: action.radius,
                },
            }
        case 'reset_dish_mask':
            return {
                ...state,
                dishMask: null,
            }

        case 'set_dish_mask_locked':
            return {
                ...state,
                dishMask: {
                    ...state.dishMask,
                    locked: action.value,
                },
            }

        case 'add_agent':
            return {
                ...state,
                agents: {
                    ...state.agents,
                    [state.nextAgentId]: action.agent,
                },
                nextAgentId: state.nextAgentId + 1,
            }

        case 'set_agent_color':
            return {
                ...state,
                agents: Object.fromEntries(
                        Object.entries(state.agents)
                                .map(([id, agent]) => [id, id === action.agent ? {
                                    ...agent,
                                    color: action.color,
                                } : agent]),
                ),
            }

        case 'delete_agent':
            return {
                ...state,
                agents: Object.fromEntries(
                        Object.entries(state.agents)
                                .filter(([id, _]) => id !== action.agent),
                ),
            }

        case 'set_agent_shape':
            return {
                ...state,
                agents: Object.fromEntries(
                        Object.entries(state.agents)
                                .map(([id, agent]) => [id, id === action.agent ? {
                                    ...agent,
                                    shape: agent.shape.map((shape, i) => {
                                        // Ensure the last and first points are always the same
                                        const shouldChange = (i === action.i) ||
                                                (i === 0 && action.i === agent.shape.length - 1) ||
                                                (i === agent.shape.length - 1 && action.i === 0)
                                        return shouldChange ? [action.shapeX, action.shapeY] : shape
                                    }),
                                } : agent]),
                ),
            }

        case 'set_agent_display_name':
            return {
                ...state,
                agents: Object.fromEntries(
                        Object.entries(state.agents)
                                .map(([id, agent]) => [id, id === action.agent ? {
                                    ...agent,
                                    display_name: action.display_name,
                                } : agent]),
                ),
            }

        case 'set_modal':
            return {
                ...state,
                modal: action.value
            }

        default:
            throw new Error("Unknown reducer action")
    }
}