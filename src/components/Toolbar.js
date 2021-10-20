import { useContext } from "react"
import { LabelsDispatch } from "./labels"
import { Button, ButtonGroup, ButtonToolbar } from "react-bootstrap"

export function Toolbar({ sample, state, nextVideo }) {
    const dispatch = useContext(LabelsDispatch)
    return (<ButtonToolbar className="m-2 d-flex align-content-center">
        {state.activeFrame}/{sample.numFrames}{' '}
        <ButtonGroup className="me-2">
            <Button
                onClick={() => dispatch({ type: 'previous_frame' })}
                disabled={state.activeFrame <= 1}
            >Prev</Button>
            <Button onClick={() => dispatch({ type: 'next_frame' })}>Next</Button>
        </ButtonGroup>
        <ButtonGroup className="me-2">
            <Button onClick={nextVideo}>Next Video</Button>
        </ButtonGroup>
    </ButtonToolbar>)
}