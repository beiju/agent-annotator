import Labelbox from '@labelbox/labeling-api'
import { useEffect, useReducer, useState } from "react"
import { Container, Row } from "react-bootstrap"
import { Sidebar } from "./Sidebar"
import { VideoLabeler } from "./VideoLabeler"
import reducer from "../reducer"
import { LabelsDispatch } from "./labels"

import agents from "../agents.json"
const defaultLabels = Object.fromEntries(agents.map(agent => [agent.name, {}]))

export default function Labeler() {
    const [sample, setSample] = useState(null)
    useEffect(() => {
        Labelbox.currentAsset().subscribe(setSample)
    }, [])

    const [labels, dispatch] = useReducer(reducer, defaultLabels)

    useEffect(() => {
        function listener(event) {
            if (event.code.startsWith('Digit') && event.key <= agents.length) {
                return dispatch({
                    type: 'toggle_agent_present',
                    agent: agents[event.key - 1].name
                })
            }

            // Add more listeners here
        }
        document.addEventListener('keyup', listener)
        return () => document.removeEventListener('keyup', listener)
    }, [])

    if (!sample) return (<p>Loading&hellip;</p>)

    return (<Container fluid className="h-100">
        <Row className="h-100">
            <LabelsDispatch.Provider value={dispatch}>
                <Sidebar labels={labels} />
                <VideoLabeler sample={sample} />
            </LabelsDispatch.Provider>
        </Row>
    </Container>)
}