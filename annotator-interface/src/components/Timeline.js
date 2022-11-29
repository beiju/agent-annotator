import { forwardRef, useContext, useEffect, useMemo, useState } from "react"

import "./Timeline.css"
import { Button, Modal, OverlayTrigger, Popover } from "react-bootstrap"
import { getSrcForFrame } from "./util"
import { LabelsDispatch } from "./labels"

function getComponentType(state, i) {
    if (i === state.activeFrame) return 'active'
    return state.frames?.[i] ? 'labeled' : 'unlabeled'
}

// The shell of this component is copied straight from react-bootstrap documentation
const UpdatingPopover = forwardRef(
    ({ popper, children, show: _, ...props }, ref) => {
        useEffect(() => {
            popper.scheduleUpdate()
        }, [children, popper])

        return (
            <Popover ref={ref} body {...props}>
                {children}
            </Popover>
        )
    },
)


export function Timeline({ sample, state }) {
    const dispatch = useContext(LabelsDispatch)

    const components = useMemo(() => {
        const components = []
        let lastComponentType = null
        let componentLength = 0
        for (let i = 1; i <= sample.numFrames; i++) {
            const componentType = getComponentType(state, i)
            if (componentType !== lastComponentType && lastComponentType !== null) {
                components.push({ componentType: lastComponentType, componentLength })
                componentLength = 0
            }
            componentLength += 1
            lastComponentType = componentType
        }

        if (componentLength !== 0) {
            components.push({ componentType: lastComponentType, componentLength })
        }
        return components
    }, [sample.numFrames, state])

    const [hoverPositionPercent, setHoverPositionPercent] = useState(null)
    const [wantsToNavigateToFrame, setWantsToNavigateToFrame] = useState(null)

    function onMouseMove(event) {
        const bounds = event.currentTarget.getBoundingClientRect()
        const pct = (event.clientX - bounds.x) / bounds.width

        // Clamp to [0, 1]
        setHoverPositionPercent(Math.max(0, Math.min(pct, 1)))
        event.preventDefault()
    }

    function onMouseLeave() {
        setHoverPositionPercent(null)
    }

    // This floor operation could return the `sample.numFrames`th frame, which doesn't exist
    const hoverPositionFrame = hoverPositionPercent === null ? null :
        Math.min(Math.floor(hoverPositionPercent * sample.numFrames), sample.numFrames - 1)

    function onClick() {
        setWantsToNavigateToFrame(hoverPositionFrame)
    }

    // This noinspection is because WebStorm thinks all arguments to OverlayTrigger are required, but most are optional
    // noinspection RequiredAttributes
    return (<>
        <Modal show={wantsToNavigateToFrame !== null} onHide={() => setWantsToNavigateToFrame(null)}>
            <Modal.Header closeButton>
                <Modal.Title>Jump to frame {wantsToNavigateToFrame}?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    You will automatically start annotating at this position. Removing annotations is not yet supported,
                    so be sure this is the frame you want.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={() => setWantsToNavigateToFrame(null)} variant="secondary">Cancel</Button>
                <Button onClick={() => {
                    dispatch({ type: 'jump_to_frame', frame: wantsToNavigateToFrame })
                    setWantsToNavigateToFrame(null)
                }}
                        variant="primary">Jump to frame</Button>
            </Modal.Footer>
        </Modal>

        <div className="timeline"
                 onMouseMove={onMouseMove}
                 onMouseLeave={onMouseLeave}
                 onClick={onClick}>

            {hoverPositionFrame !== null && <OverlayTrigger show={true} placement={'top'} overlay={
                <UpdatingPopover className="p-0">
                    <img
                        src={getSrcForFrame(sample.id, hoverPositionFrame)}
                        alt={`Frame ${hoverPositionFrame}`}
                        height={180}
                    />
                </UpdatingPopover>
            }>
                <div className="timeline-cursor" style={{
                    width: `min(2px, ${100 / sample.numFrames}%)`,
                    left: `${100 * hoverPositionFrame / sample.numFrames}%`,
                }} />
            </OverlayTrigger>}
            {components.map(({ componentType, componentLength }, i) => (
                <div key={i}
                     className={`timeline-component timeline-component-${componentType}`}
                     style={{ flexGrow: componentLength }} />
            ))}
        </div>
    </>)
}