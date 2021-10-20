import { useContext } from "react"
import { LabelsDispatch } from "./labels"
import { Button, ButtonGroup, Navbar, Spinner } from "react-bootstrap"
import { AiFillStepForward, AiFillStepBackward } from "react-icons/ai"

export function Toolbar({ sample, state, nextVideo }) {
    const dispatch = useContext(LabelsDispatch)
    return (<Navbar className="d-flex justify-content-between">
        <Navbar.Text>
            <Spinner animation="border" size="sm" className={`me-2 ${state.loading ? 'visible' : 'invisible'}`} />
            Frame {state.activeFrame} of {sample.numFrames}
        </Navbar.Text>
        <ButtonGroup>
            <Button
                onClick={() => dispatch({ type: 'previous_frame' })}
                disabled={state.activeFrame <= 1}
            ><AiFillStepBackward /></Button>
            <Button onClick={() => dispatch({ type: 'next_frame' })}><AiFillStepForward /></Button>
        </ButtonGroup>
        <ButtonGroup>
            <Button onClick={nextVideo}>Next Video</Button>
        </ButtonGroup>
    </Navbar>)
}