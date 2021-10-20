import { Col } from "react-bootstrap"

import agents from "../agents.json"
import { useContext } from "react"
import { LabelsDispatch } from "./labels"

function SidebarAgent({ agent, active, checked, onActivate, onChange }) {
    return (<li onClick={onActivate}>
        <div className={'p-2 ' + (active ? 'bg-primary text-light' : '')}>
            <input
                type="checkbox"
                id={agent.name + "-active"}
                checked={checked}
                onChange={onChange}
            />{' '}
            {agent.display_name}
        </div>
    </li>)
}

function AgentSelection({ state }) {
    const dispatch = useContext(LabelsDispatch)
    if (!dispatch) return null

    return <>
        <h4 className="text-center mt-3">Agents Present</h4>
        <p className="small text-secondary text-center">Applies to the entire video</p>

        <ol className="mx-n2">
            {agents.map(agent => (
                <SidebarAgent
                    key={agent.name}
                    agent={agent}
                    active={agent.name === state.activeAgent}
                    onActivate={() => dispatch({
                        type: 'set_active_agent',
                        activeAgent: agent.name
                    })}
                    checked={state.agentPresent[agent.name] ?? false}
                    onChange={event => dispatch({
                        type: 'set_agent_present',
                        agent: agent.name,
                        isPresent: event.currentTarget.checked
                    })}
                />
            ))}
        </ol>
    </>
}

function QualityInput({ state }) {
    const dispatch = useContext(LabelsDispatch)
    if (!dispatch) return null

    return <>
        <h4 className="text-center">Frame Quality</h4>
        <p className="small text-secondary text-center">Applies to the current frame</p>

        <ol className="mx-n2">
            <input
                type="checkbox"
                id="motion-blur"
                checked={state.frames[state.activeFrame]?.motionBlur ?? false}
                onChange={event => dispatch({
                    type: 'set_motion_blur',
                    motionBlur: event.currentTarget.checked
                })}
            />{' '}
            Motion blur
        </ol>
    </>
}

export function Sidebar({ state }) {

    return (<Col sm={2} className="bg-light h-100 border-end border-dark">
        <AgentSelection state={state} />
        <QualityInput state={state} />
    </Col>)
}