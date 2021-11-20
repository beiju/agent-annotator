import { Col, Form, FormCheck } from "react-bootstrap"

import agents from "../agents.json"
import { useContext } from "react"
import { LabelsDispatch } from "./labels"

function SidebarAgentsPresent({ state }) {
    const dispatch = useContext(LabelsDispatch)
    if (!dispatch) return null

    return <div>
        <h4 className="text-center mt-3">Agents Present</h4>
        <p className="small text-secondary text-center">Applies to the entire video</p>

        <ol className="list-unstyled m-3">
            {agents.map(agent => (
                <SidebarAgentPresent
                    key={agent.name}
                    agent={agent}
                    active={agent.name === state.activeAgent}
                    onActivate={() => dispatch({
                        type: 'set_active_agent',
                        activeAgent: agent.name
                    })}
                    checked={state.agentPresent?.[agent.name] ?? false}
                    onChange={event => dispatch({
                        type: 'set_agent_present',
                        agent: agent.name,
                        isPresent: event.currentTarget.checked
                    })}
                />
            ))}
        </ol>
    </div>
}

function SidebarAgentPresent({ agent, checked, onChange }) {
    return (<li>
        <Form.Check
            type="checkbox"
            id={agent.name + "-active"}
            label={agent.display_name}
            checked={checked}
            onChange={onChange}
        />
    </li>)
}

function SidebarAgentAnnotation({ state, agent, label }) {
    const dispatch = useContext(LabelsDispatch)
    if (!dispatch) return null

    return <li
        className={"list-group-item py-2 px-3 " + (state.activeAgent === agent.name ? 'active' : '')}
        onClick={() => dispatch({ type: 'set_active_agent', activeAgent: agent.name })}
    >
        {agent.display_name}
        <Form>
            <FormCheck
                id={`agent-${agent.name}-blurred`}
                label={"Blurred"}
                checked={label?.isBlurred ?? false}
                onChange={event => dispatch({
                    type: 'set_agent_is_blurred',
                    agentName: agent.name,
                    isBlurred: event.currentTarget.checked
                })}
            />
            <FormCheck
                id={`agent-${agent.name}-obscured`}
                label={"Obscured"}
                checked={label?.isObscured ?? false}
                onChange={event => dispatch({
                    type: 'set_agent_is_obscured',
                    agentName: agent.name,
                    isObscured: event.currentTarget.checked
                })}
            />
        </Form>
    </li>
}

function SidebarAgentAnnotations({ state }) {
    return <div className="flex-grow-1">
        <h4 className="text-center mt-3">Agent Annotations</h4>
        <p className="small text-secondary text-center">Applies to the current frame</p>

        <ul className="list-group list-group-flush">
            {agents.map(agent =>
                state.agentPresent?.[agent.name] &&
                <SidebarAgentAnnotation
                    key={agent.name}
                    state={state}
                    agent={agent}
                    label={state.frames?.[state.activeFrame]?.[agent.name]}
                />
            )}
        </ul>
        {Object.values(state.agentPresent).every(x => !x) && <p className="text-center mx-2">
            Use the checkboxes below to select the agents that are present in this video
        </p>}
    </div>
}

export function Sidebar({ state }) {

    return (<Col md={4} lg={3} xl={2} className="bg-light h-100 border-end border-dark d-flex flex-column gx-0">
        <SidebarAgentAnnotations state={state} />
        <SidebarAgentsPresent state={state} />
    </Col>)
}